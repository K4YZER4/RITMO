import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSuscripcionEnum, Prisma, UnidadPeriodoEnum, UserRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../../stripe/stripe.service';
import { CrearSuscripcionPendientePagoService } from '../services/crear-suscripcion-pendiente-pago.service';
import { MODOS_CAMBIO_PLAN, ModoCambioPlan } from '../../../common/constants/modo-cambio';

const ESTADOS_SUSCRIPCION_ACTUAL: EstadoSuscripcionEnum[] = [
  EstadoSuscripcionEnum.prueba,
  EstadoSuscripcionEnum.activa,
  EstadoSuscripcionEnum.morosa,
];

type PlanPeriodo = {
  duracionUnidad: UnidadPeriodoEnum | null;
  duracionCantidad: number | null;
  esVitalicio: boolean;
};

@Injectable()
export class CambiarPlanSuscripcionHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crearSuscripcionPendientePagoService: CrearSuscripcionPendientePagoService,
    private readonly stripeService: StripeService,
  ) {}

  async ejecutar(usuarioId: string, idPlanNuevo: number, modoCambio: ModoCambioPlan) {
    const usuario = await this.prisma.usuario.findUnique({
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

    const suscripcionActual = await this.buscarSuscripcionActual(usuarioId, usuario.role);

    if (!suscripcionActual.proveedorSubscriptionId) {
      return this.aplicarCambioPlanLocal(usuarioId, idPlanNuevo, usuario.role);
    }

    if (modoCambio === MODOS_CAMBIO_PLAN.INSTANTANEO) {
      await this.stripeService.cancelarInmediatamente(suscripcionActual.proveedorSubscriptionId);
      return this.aplicarCambioPlanLocal(usuarioId, idPlanNuevo, usuario.role);
    }

    return this.programarCambioAlFinalDelPeriodo(
      suscripcionActual,
      usuarioId,
      idPlanNuevo,
      usuario.role,
    );
  }

  async aplicarCambioPlanDesdeProveedor(suscripcionId: bigint) {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: {
        id: suscripcionId,
      },
      select: {
        id: true,
        alumnoId: true,
        entrenadorId: true,
        planAlumnoPendienteId: true,
        planEntrenadorPendienteId: true,
      },
    });

    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    const tienePlanPendiente =
      suscripcion.planAlumnoPendienteId !== null || suscripcion.planEntrenadorPendienteId !== null;

    if (!tienePlanPendiente) {
      return {
        aplicado: false,
        motivo: 'La suscripción no tiene un cambio de plan pendiente',
      };
    }

    const { usuarioId, idPlanNuevo, role } = this.determinarTitularYPendiente(suscripcion);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.suscripcion.update({
          where: {
            id: suscripcion.id,
          },
          data: {
            planAlumnoPendienteId: null,
            planEntrenadorPendienteId: null,
          },
        });

        if (role === UserRole.alumno) {
          await this.cambiarPlanAlumno(tx, usuarioId, idPlanNuevo, new Date());
        } else {
          await this.cambiarPlanEntrenador(tx, usuarioId, idPlanNuevo, new Date());
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return {
      aplicado: true,
      suscripcionId: suscripcion.id.toString(),
      idPlanNuevo,
    };
  }

  private async aplicarCambioPlanLocal(usuarioId: string, idPlanNuevo: number, role: UserRole) {
    return this.prisma.$transaction(
      async (tx) => {
        const ahora = new Date();

        if (role === UserRole.alumno) {
          return this.cambiarPlanAlumno(tx, usuarioId, idPlanNuevo, ahora);
        }

        if (role === UserRole.entrenador) {
          return this.cambiarPlanEntrenador(tx, usuarioId, idPlanNuevo, ahora);
        }

        throw new ForbiddenException('Rol no válido para cambiar plan');
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private async programarCambioAlFinalDelPeriodo(
    suscripcionActual: {
      id: bigint;
      alumnoId: string | null;
      entrenadorId: string | null;
      proveedorSubscriptionId: string | null;
      planAlumnoPendienteId: number | null;
      planEntrenadorPendienteId: number | null;
    },
    usuarioId: string,
    idPlanNuevo: number,
    role: UserRole,
  ) {
    const tienePendientePrevio =
      suscripcionActual.planAlumnoPendienteId !== null ||
      suscripcionActual.planEntrenadorPendienteId !== null;

    if (tienePendientePrevio) {
      throw new ConflictException(
        'Ya existe un cambio de plan programado al final del periodo actual',
      );
    }

    if (role === UserRole.alumno) {
      const alumno = await this.prisma.alumno.findUnique({
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

      if (alumno.idPlan === idPlanNuevo) {
        throw new ConflictException('Ya tienes asignado este plan');
      }

      const nuevoPlan = await this.prisma.planAlumno.findUnique({
        where: {
          id: idPlanNuevo,
        },
      });

      if (!nuevoPlan || !nuevoPlan.estaActivo) {
        throw new NotFoundException('Plan de alumno no encontrado o inactivo');
      }
    } else if (role === UserRole.entrenador) {
      const entrenador = await this.prisma.entrenador.findUnique({
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

      if (entrenador.idPlan === idPlanNuevo) {
        throw new ConflictException('Ya tienes asignado este plan');
      }

      const nuevoPlan = await this.prisma.planEntrenador.findUnique({
        where: {
          id: idPlanNuevo,
        },
      });

      if (!nuevoPlan || !nuevoPlan.estaActivo) {
        throw new NotFoundException('Plan de entrenador no encontrado o inactivo');
      }
    } else {
      throw new ForbiddenException('Rol no válido para cambiar plan');
    }

    if (!suscripcionActual.proveedorSubscriptionId) {
      throw new BadRequestException(
        'La suscripción no tiene una suscripción Stripe activa para programar el cambio',
      );
    }

    await this.stripeService.cancelarAlFinalDelPeriodo(suscripcionActual.proveedorSubscriptionId);

    const dataPendiente =
      role === UserRole.alumno
        ? {
            planAlumnoPendienteId: idPlanNuevo,
          }
        : {
            planEntrenadorPendienteId: idPlanNuevo,
          };

    const suscripcionActualizada = await this.prisma.suscripcion.update({
      where: {
        id: suscripcionActual.id,
      },
      data: {
        ...dataPendiente,
        cancelarAlFinalDelPeriodo: true,
        siguienteCobroEn: null,
      },
    });

    return {
      programado: true,
      modoCambio: MODOS_CAMBIO_PLAN.FINAL_PERIODO,
      idPlanPendiente: idPlanNuevo,
      suscripcionId: suscripcionActualizada.id.toString(),
    };
  }

  private determinarTitularYPendiente(suscripcion: {
    alumnoId: string | null;
    entrenadorId: string | null;
    planAlumnoPendienteId: number | null;
    planEntrenadorPendienteId: number | null;
  }): { usuarioId: string; idPlanNuevo: number; role: UserRole } {
    if (suscripcion.planAlumnoPendienteId !== null && suscripcion.alumnoId) {
      return {
        usuarioId: suscripcion.alumnoId,
        idPlanNuevo: suscripcion.planAlumnoPendienteId,
        role: UserRole.alumno,
      };
    }

    if (suscripcion.planEntrenadorPendienteId !== null && suscripcion.entrenadorId) {
      return {
        usuarioId: suscripcion.entrenadorId,
        idPlanNuevo: suscripcion.planEntrenadorPendienteId,
        role: UserRole.entrenador,
      };
    }

    throw new BadRequestException('La suscripción no tiene un cambio de plan pendiente');
  }

  private async cambiarPlanAlumno(
    tx: Prisma.TransactionClient,
    alumnoId: string,
    idPlanNuevo: number,
    ahora: Date,
  ) {
    const alumno = await tx.alumno.findUnique({
      where: {
        idUsuario: alumnoId,
      },
      select: {
        idPlan: true,
      },
    });

    if (!alumno) {
      throw new NotFoundException('Alumno no encontrado');
    }

    if (alumno.idPlan === idPlanNuevo) {
      throw new ConflictException('Ya tienes asignado este plan');
    }

    const nuevoPlan = await tx.planAlumno.findUnique({
      where: {
        id: idPlanNuevo,
      },
    });

    if (!nuevoPlan || !nuevoPlan.estaActivo) {
      throw new NotFoundException('Plan de alumno no encontrado o inactivo');
    }

    await tx.suscripcion.updateMany({
      where: {
        alumnoId,
        estado: {
          in: ESTADOS_SUSCRIPCION_ACTUAL,
        },
      },
      data: {
        estado: EstadoSuscripcionEnum.cancelada,
        canceladaEn: ahora,
        siguienteCobroEn: null,
        cancelarAlFinalDelPeriodo: false,
      },
    });

    await tx.alumno.update({
      where: {
        idUsuario: alumnoId,
      },
      data: {
        idPlan: idPlanNuevo,
      },
    });

    if (nuevoPlan.esGratuito) {
      return tx.suscripcion.create({
        data: {
          alumnoId,
          planAlumnoId: nuevoPlan.id,
          estado: EstadoSuscripcionEnum.activa,
          periodoActualInicio: ahora,
          periodoActualFin: null,
          siguienteCobroEn: null,
          cancelarAlFinalDelPeriodo: false,
          vitalicia: true,
          planNombreSnapshot: nuevoPlan.nombre,
          precioSnapshot: nuevoPlan.precio,
          monedaSnapshot: nuevoPlan.moneda.toUpperCase(),
          proveedorPrecioIdSnapshot: nuevoPlan.proveedorPrecioId,
          duracionUnidadSnapshot: nuevoPlan.duracionUnidad,
          duracionCantidadSnapshot: nuevoPlan.duracionCantidad,
        },
      });
    }

    const resultado = await this.crearSuscripcionPendientePagoService.ejecutar(
      tx,
      {
        alumnoId,
        planAlumnoId: nuevoPlan.id,
      },
      nuevoPlan,
      ahora,
    );

    return resultado.suscripcion;
  }

  private async cambiarPlanEntrenador(
    tx: Prisma.TransactionClient,
    entrenadorId: string,
    idPlanNuevo: number,
    ahora: Date,
  ) {
    const entrenador = await tx.entrenador.findUnique({
      where: {
        idUsuario: entrenadorId,
      },
      select: {
        idPlan: true,
      },
    });

    if (!entrenador) {
      throw new NotFoundException('Entrenador no encontrado');
    }

    if (entrenador.idPlan === idPlanNuevo) {
      throw new ConflictException('Ya tienes asignado este plan');
    }

    const nuevoPlan = await tx.planEntrenador.findUnique({
      where: {
        id: idPlanNuevo,
      },
    });

    if (!nuevoPlan || !nuevoPlan.estaActivo) {
      throw new NotFoundException('Plan de entrenador no encontrado o inactivo');
    }

    await tx.suscripcion.updateMany({
      where: {
        entrenadorId,
        estado: {
          in: ESTADOS_SUSCRIPCION_ACTUAL,
        },
      },
      data: {
        estado: EstadoSuscripcionEnum.cancelada,
        canceladaEn: ahora,
        siguienteCobroEn: null,
        cancelarAlFinalDelPeriodo: false,
      },
    });

    await tx.entrenador.update({
      where: {
        idUsuario: entrenadorId,
      },
      data: {
        idPlan: idPlanNuevo,
      },
    });

    if (nuevoPlan.esGratuito) {
      if (nuevoPlan.esVitalicio) {
        return tx.suscripcion.create({
          data: {
            entrenadorId,
            planEntrenadorId: nuevoPlan.id,
            estado: EstadoSuscripcionEnum.activa,
            periodoActualInicio: ahora,
            periodoActualFin: null,
            siguienteCobroEn: null,
            cancelarAlFinalDelPeriodo: false,
            vitalicia: true,
            planNombreSnapshot: nuevoPlan.nombre,
            precioSnapshot: nuevoPlan.precio,
            monedaSnapshot: nuevoPlan.moneda.toUpperCase(),
            proveedorPrecioIdSnapshot: nuevoPlan.proveedorPrecioId,
            duracionUnidadSnapshot: nuevoPlan.duracionUnidad,
            duracionCantidadSnapshot: nuevoPlan.duracionCantidad,
          },
        });
      }

      const finPrueba = this.calcularFinSegunPlan(ahora, nuevoPlan);

      if (!finPrueba) {
        throw new BadRequestException('El plan de prueba del entrenador debe tener duración');
      }

      await tx.entrenador.update({
        where: {
          idUsuario: entrenadorId,
        },
        data: {
          pruebaUtilizada: true,
        },
      });

      return tx.suscripcion.create({
        data: {
          entrenadorId,
          planEntrenadorId: nuevoPlan.id,
          estado: EstadoSuscripcionEnum.prueba,
          periodoActualInicio: ahora,
          periodoActualFin: finPrueba,
          siguienteCobroEn: finPrueba,
          cancelarAlFinalDelPeriodo: false,
          vitalicia: false,
          planNombreSnapshot: nuevoPlan.nombre,
          precioSnapshot: nuevoPlan.precio,
          monedaSnapshot: nuevoPlan.moneda.toUpperCase(),
          proveedorPrecioIdSnapshot: nuevoPlan.proveedorPrecioId,
          duracionUnidadSnapshot: nuevoPlan.duracionUnidad,
          duracionCantidadSnapshot: nuevoPlan.duracionCantidad,
        },
      });
    }

    const resultado = await this.crearSuscripcionPendientePagoService.ejecutar(
      tx,
      {
        entrenadorId,
        planEntrenadorId: nuevoPlan.id,
      },
      nuevoPlan,
      ahora,
    );

    return resultado.suscripcion;
  }

  private async buscarSuscripcionActual(usuarioId: string, role: UserRole) {
    const where =
      role === UserRole.alumno
        ? { alumnoId: usuarioId }
        : role === UserRole.entrenador
          ? { entrenadorId: usuarioId }
          : null;

    if (!where) {
      throw new ForbiddenException('Rol no válido para suscripciones');
    }

    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: {
        ...where,
        estado: {
          in: ESTADOS_SUSCRIPCION_ACTUAL,
        },
      },
      orderBy: {
        periodoActualInicio: 'desc',
      },
    });

    if (!suscripcion) {
      throw new NotFoundException('Suscripción vigente no encontrada');
    }

    return suscripcion;
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
