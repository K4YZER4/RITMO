import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSuscripcionEnum, Prisma, UnidadPeriodoEnum, UserRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { CrearSuscripcionPendientePagoService } from '../services/crear-suscripcion-pendiente-pago.service';

type SuscripcionResultado = {
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
  creada: boolean;
};

type SuscriptorWhere =
  | {
      alumnoId: string;
    }
  | {
      entrenadorId: string;
    };

type PlanPeriodo = {
  duracionUnidad: UnidadPeriodoEnum | null;
  duracionCantidad: number | null;
  esVitalicio: boolean;
};

const ESTADOS_SUSCRIPCION_ACTUAL: EstadoSuscripcionEnum[] = [
  EstadoSuscripcionEnum.prueba,
  EstadoSuscripcionEnum.activa,
  EstadoSuscripcionEnum.morosa,
];

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
export class ActivarSuscripcionInicialHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crearSuscripcionPendientePagoService: CrearSuscripcionPendientePagoService,
  ) {}

  async ejecutar(usuarioId: string, tx?: Prisma.TransactionClient): Promise<SuscripcionResultado> {
    if (tx) {
      return this.ejecutarEnTx(tx, usuarioId);
    }

    return this.prisma.$transaction(async (txInterno) => this.ejecutarEnTx(txInterno, usuarioId), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async ejecutarEnTx(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<SuscripcionResultado> {
    const usuario = await tx.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        role: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.role === UserRole.alumno) {
      return this.activarAlumno(tx, usuarioId);
    }

    if (usuario.role === UserRole.entrenador) {
      return this.activarEntrenador(tx, usuarioId);
    }

    throw new ForbiddenException('Rol no válido para suscripciones');
  }

  private async activarAlumno(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<SuscripcionResultado> {
    const suscripcionExistente = await this.buscarSuscripcionActualEnTx(tx, {
      alumnoId: usuarioId,
    });

    if (suscripcionExistente) {
      return {
        suscripcion: suscripcionExistente,
        creada: false,
      };
    }

    const alumno = await tx.alumno.findUnique({
      where: {
        idUsuario: usuarioId,
      },
      select: {
        idPlan: true,
      },
    });

    if (!alumno) {
      throw new NotFoundException('Alumno no encontrado');
    }

    const planAlumno = await tx.planAlumno.findUnique({
      where: {
        id: alumno.idPlan,
      },
    });

    if (!planAlumno || !planAlumno.estaActivo) {
      throw new NotFoundException('Plan del alumno no encontrado o inactivo');
    }

    const ahora = new Date();

    if (planAlumno.esGratuito) {
      const suscripcion = await tx.suscripcion.create({
        data: {
          alumnoId: usuarioId,
          planAlumnoId: planAlumno.id,
          estado: EstadoSuscripcionEnum.activa,
          periodoActualInicio: ahora,
          periodoActualFin: null,
          siguienteCobroEn: null,
          cancelarAlFinalDelPeriodo: false,
          vitalicia: true,
          planNombreSnapshot: planAlumno.nombre,
          precioSnapshot: planAlumno.precio,
          monedaSnapshot: planAlumno.moneda.toUpperCase(),
          proveedorPrecioIdSnapshot: planAlumno.proveedorPrecioId,
          duracionUnidadSnapshot: planAlumno.duracionUnidad,
          duracionCantidadSnapshot: planAlumno.duracionCantidad,
        },
        select: SELECT_SUSCRIPCION_RESULTADO,
      });

      return {
        suscripcion,
        creada: true,
      };
    }

    const resultado = await this.crearSuscripcionPendientePagoService.ejecutar(
      tx,
      {
        alumnoId: usuarioId,
        planAlumnoId: planAlumno.id,
      },
      planAlumno,
      ahora,
    );

    return {
      suscripcion: resultado.suscripcion,
      creada: true,
    };
  }

  private async activarEntrenador(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<SuscripcionResultado> {
    const suscripcionExistente = await this.buscarSuscripcionActualEnTx(tx, {
      entrenadorId: usuarioId,
    });

    if (suscripcionExistente) {
      return {
        suscripcion: suscripcionExistente,
        creada: false,
      };
    }

    const entrenador = await tx.entrenador.findUnique({
      where: {
        idUsuario: usuarioId,
      },
      select: {
        idPlan: true,
      },
    });

    if (!entrenador) {
      throw new NotFoundException('Entrenador no encontrado');
    }

    const planEntrenador = await tx.planEntrenador.findUnique({
      where: {
        id: entrenador.idPlan,
      },
    });

    if (!planEntrenador || !planEntrenador.estaActivo) {
      throw new NotFoundException('Plan del entrenador no encontrado o inactivo');
    }

    const ahora = new Date();

    if (planEntrenador.esGratuito) {
      const finPrueba = this.calcularFinSegunPlan(ahora, planEntrenador);

      if (!finPrueba) {
        throw new BadRequestException('El plan de prueba del entrenador debe tener duración');
      }

      const suscripcion = await tx.suscripcion.create({
        data: {
          entrenadorId: usuarioId,
          planEntrenadorId: planEntrenador.id,
          estado: EstadoSuscripcionEnum.prueba,
          periodoActualInicio: ahora,
          periodoActualFin: finPrueba,
          siguienteCobroEn: finPrueba,
          cancelarAlFinalDelPeriodo: false,
          vitalicia: false,
          planNombreSnapshot: planEntrenador.nombre,
          precioSnapshot: planEntrenador.precio,
          monedaSnapshot: planEntrenador.moneda.toUpperCase(),
          proveedorPrecioIdSnapshot: planEntrenador.proveedorPrecioId,
          duracionUnidadSnapshot: planEntrenador.duracionUnidad,
          duracionCantidadSnapshot: planEntrenador.duracionCantidad,
        },
        select: SELECT_SUSCRIPCION_RESULTADO,
      });

      return {
        suscripcion,
        creada: true,
      };
    }

    const resultado = await this.crearSuscripcionPendientePagoService.ejecutar(
      tx,
      {
        entrenadorId: usuarioId,
        planEntrenadorId: planEntrenador.id,
      },
      planEntrenador,
      ahora,
    );

    return {
      suscripcion: resultado.suscripcion,
      creada: true,
    };
  }

  private async buscarSuscripcionActualEnTx(tx: Prisma.TransactionClient, where: SuscriptorWhere) {
    return tx.suscripcion.findFirst({
      where: {
        ...where,
        estado: {
          in: ESTADOS_SUSCRIPCION_ACTUAL,
        },
      },
      orderBy: {
        periodoActualInicio: 'desc',
      },
      select: SELECT_SUSCRIPCION_RESULTADO,
    });
  }

  private calcularFinSegunPlan(inicio: Date, plan: PlanPeriodo): Date | null {
    if (plan.esVitalicio) {
      return null;
    }

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
