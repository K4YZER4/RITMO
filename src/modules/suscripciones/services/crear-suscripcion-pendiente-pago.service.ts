import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EstadoPagoEnum,
  EstadoSuscripcionEnum,
  Prisma,
  ProveedorPagoEnum,
  UnidadPeriodoEnum,
} from '@prisma/client';

type TitularSuscripcion = {
  alumnoId?: string;
  entrenadorId?: string;
  planAlumnoId?: number;
  planEntrenadorId?: number;
};

type PlanParaSuscripcionPendiente = {
  id: number;
  nombre: string;
  precio: Prisma.Decimal;
  moneda: string;
  proveedorPrecioId: string | null;
  duracionUnidad: UnidadPeriodoEnum | null;
  duracionCantidad: number | null;
  esVitalicio: boolean;
  cobraRecurrentemente: boolean;
};

const SELECT_SUSCRIPCION_RESULTADO = {
  id: true,
  alumnoId: true,
  entrenadorId: true,
  estado: true,
  planAlumnoId: true,
  planEntrenadorId: true,
  periodoActualInicio: true,
  periodoActualFin: true,
  siguienteCobroEn: true,
  vitalicia: true,
  proveedorPrecioIdSnapshot: true,
} satisfies Prisma.SuscripcionSelect;

@Injectable()
export class CrearSuscripcionPendientePagoService {
  async ejecutar(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
    plan: PlanParaSuscripcionPendiente,
    ahora: Date,
  ) {
    if (plan.esVitalicio || !plan.cobraRecurrentemente) {
      throw new BadRequestException(
        'Los planes de pago único o vitalicios aún no están implementados. Este flujo requiere Stripe Checkout con mode payment.',
      );
    }

    if (!plan.proveedorPrecioId) {
      throw new BadRequestException(
        'El plan de pago no tiene proveedorPrecioId configurado en Stripe',
      );
    }

    const suscripcion = await tx.suscripcion.create({
      data: {
        ...titular,
        estado: EstadoSuscripcionEnum.morosa,
        periodoActualInicio: ahora,
        periodoActualFin: null,
        siguienteCobroEn: null,
        cancelarAlFinalDelPeriodo: false,
        vitalicia: false,
        planNombreSnapshot: plan.nombre,
        precioSnapshot: plan.precio,
        monedaSnapshot: plan.moneda.toUpperCase(),
        proveedorPrecioIdSnapshot: plan.proveedorPrecioId,
        duracionUnidadSnapshot: plan.duracionUnidad,
        duracionCantidadSnapshot: plan.duracionCantidad,
      },
      select: SELECT_SUSCRIPCION_RESULTADO,
    });

    const finDelPeriodo = this.calcularFinDelPeriodo(ahora, plan);

    await tx.pago.create({
      data: {
        suscripcionId: suscripcion.id,
        monto: plan.precio,
        moneda: plan.moneda.toUpperCase(),
        estado: EstadoPagoEnum.pendiente,
        venceEn: finDelPeriodo,
        proveedor: ProveedorPagoEnum.stripe,
      },
    });

    return {
      suscripcion,
    };
  }

  private calcularFinDelPeriodo(inicio: Date, plan: PlanParaSuscripcionPendiente): Date {
    if (!plan.duracionUnidad || !plan.duracionCantidad) {
      throw new BadRequestException('El plan no tiene una duración configurada');
    }

    const fin = new Date(inicio);

    switch (plan.duracionUnidad) {
      case UnidadPeriodoEnum.dia:
        fin.setDate(fin.getDate() + plan.duracionCantidad);
        return fin;

      case UnidadPeriodoEnum.semana:
        fin.setDate(fin.getDate() + plan.duracionCantidad * 7);
        return fin;

      case UnidadPeriodoEnum.mes:
        fin.setMonth(fin.getMonth() + plan.duracionCantidad);
        return fin;

      case UnidadPeriodoEnum.año:
        fin.setFullYear(fin.getFullYear() + plan.duracionCantidad);
        return fin;

      default:
        throw new BadRequestException('Unidad de duración no válida');
    }
  }
}
