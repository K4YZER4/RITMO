import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EstadoPagoEnum,
  EstadoSuscripcionEnum,
  Prisma,
  ProveedorPagoEnum,
  UnidadPeriodoEnum,
} from '@prisma/client';

import { sumarUnidadCalendar } from '../../../common/utils/fecha.util';
import { StripeService } from '../../stripe/stripe.service';

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
  esGratuito: boolean;
  cobraRecurrentemente: boolean;
  periodoPrueba: number | null;
  unidadPeriodoPrueba: UnidadPeriodoEnum | null;
};

type CuentaTitular = {
  pruebaUtilizada: boolean;
  proveedorCustomerId: string | null;
};

type ResultadoSuscripcionPendiente = {
  suscripcion: {
    id: bigint;
    alumnoId: string | null;
    entrenadorId: string | null;
    estado: EstadoSuscripcionEnum;
    planAlumnoId: number | null;
    planEntrenadorId: number | null;
    periodoActualInicio: Date;
    periodoActualFin: Date | null;
    siguienteCobroEn: Date | null;
    vitalicia: boolean;
    proveedorPrecioIdSnapshot: string | null;
  };
  pagoId: bigint;
  trialEnd?: Date;
  customerId?: string | null;
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
  constructor(private readonly stripeService: StripeService) {}

  async ejecutar(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
    plan: PlanParaSuscripcionPendiente,
    ahora: Date,
  ): Promise<ResultadoSuscripcionPendiente> {
    if (!plan.proveedorPrecioId) {
      throw new BadRequestException(
        'El plan de pago no tiene proveedorPrecioId configurado en Stripe',
      );
    }

    const cuenta = await this.obtenerCuentaTitular(tx, titular);

    const usarPrueba =
      !plan.esVitalicio &&
      !plan.esGratuito &&
      (plan.periodoPrueba ?? 0) > 0 &&
      !!plan.unidadPeriodoPrueba &&
      !cuenta.pruebaUtilizada;

    const customerId = await this.asegurarCustomerId(tx, titular, cuenta, usarPrueba);

    const trialEnd = usarPrueba
      ? sumarUnidadCalendar(ahora, plan.periodoPrueba!, plan.unidadPeriodoPrueba)
      : null;

    const suscripcion = await tx.suscripcion.create({
      data: {
        ...titular,
        estado: usarPrueba
          ? EstadoSuscripcionEnum.prueba
          : EstadoSuscripcionEnum.morosa,
        periodoActualInicio: ahora,
        periodoActualFin: trialEnd,
        siguienteCobroEn: trialEnd,
        cancelarAlFinalDelPeriodo: false,
        vitalicia: false,
        planNombreSnapshot: plan.nombre,
        precioSnapshot: plan.precio,
        monedaSnapshot: plan.moneda.toUpperCase(),
        proveedorPrecioIdSnapshot: plan.proveedorPrecioId,
        proveedorCustomerId: customerId,
        duracionUnidadSnapshot: plan.duracionUnidad,
        duracionCantidadSnapshot: plan.duracionCantidad,
      },
      select: SELECT_SUSCRIPCION_RESULTADO,
    });

    const pago = await tx.pago.create({
      data: {
        suscripcionId: suscripcion.id,
        monto: plan.precio,
        moneda: plan.moneda.toUpperCase(),
        estado: EstadoPagoEnum.pendiente,
        venceEn: usarPrueba ? trialEnd! : this.calcularFinDelPeriodo(ahora, plan),
        proveedor: ProveedorPagoEnum.stripe,
      },
      select: {
        id: true,
      },
    });

    if (usarPrueba) {
      await this.marcarPruebaUtilizada(tx, titular);
    }

    return {
      suscripcion,
      pagoId: pago.id,
      ...(trialEnd ? { trialEnd } : {}),
      ...(customerId ? { customerId } : {}),
    };
  }

  private async obtenerCuentaTitular(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
  ): Promise<CuentaTitular> {
    if (titular.alumnoId) {
      const alumno = await tx.alumno.findUnique({
        where: {
          idUsuario: titular.alumnoId,
        },
        select: {
          pruebaUtilizada: true,
          proveedorCustomerId: true,
        },
      });

      if (!alumno) {
        throw new BadRequestException('Alumno no encontrado');
      }

      return {
        pruebaUtilizada: alumno.pruebaUtilizada ?? false,
        proveedorCustomerId: alumno.proveedorCustomerId,
      };
    }

    if (titular.entrenadorId) {
      const entrenador = await tx.entrenador.findUnique({
        where: {
          idUsuario: titular.entrenadorId,
        },
        select: {
          pruebaUtilizada: true,
          proveedorCustomerId: true,
        },
      });

      if (!entrenador) {
        throw new BadRequestException('Entrenador no encontrado');
      }

      return {
        pruebaUtilizada: entrenador.pruebaUtilizada ?? false,
        proveedorCustomerId: entrenador.proveedorCustomerId,
      };
    }

    throw new BadRequestException('La suscripción no tiene un titular válido');
  }

  private async asegurarCustomerId(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
    cuenta: CuentaTitular,
    usarPrueba: boolean,
  ): Promise<string | null> {
    if (!usarPrueba) {
      return cuenta.proveedorCustomerId ?? null;
    }

    if (cuenta.proveedorCustomerId) {
      return cuenta.proveedorCustomerId;
    }

    const usuarioId = titular.alumnoId ?? titular.entrenadorId!;

    const usuario = await tx.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        correo: true,
        nombre: true,
      },
    });

    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const cliente = await this.stripeService.crearOActualizarCustomer({
      usuarioId,
      correo: usuario.correo,
      nombre: usuario.nombre,
    });

    await this.actualizarCustomerIdEnCuenta(tx, titular, cliente.id);

    return cliente.id;
  }

  private async actualizarCustomerIdEnCuenta(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
    customerId: string,
  ): Promise<void> {
    if (titular.alumnoId) {
      await tx.alumno.update({
        where: {
          idUsuario: titular.alumnoId,
        },
        data: {
          proveedorCustomerId: customerId,
        },
      });

      return;
    }

    await tx.entrenador.update({
      where: {
        idUsuario: titular.entrenadorId!,
      },
      data: {
        proveedorCustomerId: customerId,
      },
    });
  }

  private async marcarPruebaUtilizada(
    tx: Prisma.TransactionClient,
    titular: TitularSuscripcion,
  ): Promise<void> {
    if (titular.alumnoId) {
      await tx.alumno.update({
        where: {
          idUsuario: titular.alumnoId,
        },
        data: {
          pruebaUtilizada: true,
        },
      });

      return;
    }

    await tx.entrenador.update({
      where: {
        idUsuario: titular.entrenadorId!,
      },
      data: {
        pruebaUtilizada: true,
      },
    });
  }

  private calcularFinDelPeriodo(inicio: Date, plan: PlanParaSuscripcionPendiente): Date {
    if (!plan.duracionUnidad || !plan.duracionCantidad) {
      throw new BadRequestException('El plan no tiene una duración configurada');
    }

    return sumarUnidadCalendar(inicio, plan.duracionCantidad, plan.duracionUnidad);
  }
}