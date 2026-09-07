import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  EstadoPagoEnum,
  EstadoSuscripcionEnum,
  Prisma,
  ProveedorPagoEnum,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { ActivarSuscripcionInicialHandler } from './handlers/activar-suscripcion-inicial.handler';
import { ActualizarSuscripcionPorPagoHandler } from './handlers/actualizar-suscripcion-por-pago.handler';
import { CambiarPlanSuscripcionHandler } from './handlers/cambiar-plan-suscripcion.handler';

type EstadoPagoResultado = {
  estado: EstadoPagoEnum;
  pagoId?: bigint;
};

type SuscriptorWhere = { alumnoId: string } | { entrenadorId: string };

const ESTADOS_SUSCRIPCION_ACTUAL: EstadoSuscripcionEnum[] = [
  EstadoSuscripcionEnum.prueba,
  EstadoSuscripcionEnum.activa,
  EstadoSuscripcionEnum.morosa,
];

@Injectable()
export class SuscripcionesService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly activarSuscripcionInicialHandler: ActivarSuscripcionInicialHandler,
    private readonly actualizarSuscripcionPorPagoHandler: ActualizarSuscripcionPorPagoHandler,
    private readonly cambiarPlanSuscripcionHandler: CambiarPlanSuscripcionHandler,
  ) {}

  onApplicationBootstrap() {
    const INTERVALO_HORAS = 24;

    const ejecutar = () => {
      this.expirarSuscripcionesVencidas().catch((err) => {
        console.error('Error al expirar suscripciones vencidas:', err);
      });
    };

    ejecutar();

    setInterval(ejecutar, INTERVALO_HORAS * 60 * 60 * 1000);
  }

  async obtenerRol(usuarioId: string): Promise<UserRole> {
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

    return usuario.role;
  }

  async obtenerEstadoPago(usuarioId: string): Promise<EstadoPagoResultado> {
    const role = await this.obtenerRol(usuarioId);

    const suscripcion = await this.buscarSuscripcionActual(usuarioId, role);

    this.validarVigencia(suscripcion);

    if (suscripcion.vitalicia || suscripcion.estado === EstadoSuscripcionEnum.prueba) {
      return {
        estado: EstadoPagoEnum.pagado,
      };
    }

    const pago = await this.buscarUltimoPago(suscripcion.id);

    return {
      estado: pago.estado,
      pagoId: pago.id,
    };
  }

  async activarSuscripcionInicial(usuarioId: string, tx?: Prisma.TransactionClient) {
    return this.activarSuscripcionInicialHandler.ejecutar(usuarioId, tx);
  }

  async obtenerSuscripcionActual(usuarioId: string) {
    const role = await this.obtenerRol(usuarioId);

    const where = this.crearWhereSuscriptor(usuarioId, role);

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
      include: {
        planAlumno: true,
        planEntrenador: true,
        pagos: {
          orderBy: [
            {
              venceEn: 'desc',
            },
            {
              creadoEn: 'desc',
            },
          ],
          take: 1,
        },
      },
    });

    if (!suscripcion) {
      throw new NotFoundException('No se encontró una suscripción actual');
    }

    return suscripcion;
  }

  async validarAccesoSuscripcion(usuarioId: string) {
    const role = await this.obtenerRol(usuarioId);

    const suscripcion = await this.buscarSuscripcionActual(usuarioId, role);

    if (suscripcion.estado === EstadoSuscripcionEnum.morosa) {
      throw new ForbiddenException(
        'Tu pago está pendiente o falló. Completa o actualiza el pago para continuar.',
      );
    }

    this.validarVigencia(suscripcion);

    if (
      suscripcion.estado !== EstadoSuscripcionEnum.prueba &&
      suscripcion.estado !== EstadoSuscripcionEnum.activa
    ) {
      throw new ForbiddenException('Tu suscripción no permite acceder a esta función');
    }

    return suscripcion;
  }

  async cambiarPlan(usuarioId: string, idPlanNuevo: number) {
    return this.cambiarPlanSuscripcionHandler.ejecutar(usuarioId, idPlanNuevo);
  }

  async cancelarSuscripcion(usuarioId: string) {
    const role = await this.obtenerRol(usuarioId);

    const suscripcion = await this.buscarSuscripcionActual(usuarioId, role);

    if (suscripcion.vitalicia) {
      throw new BadRequestException(
        'Una suscripción vitalicia no tiene cobros recurrentes que cancelar',
      );
    }

    if (suscripcion.cancelarAlFinalDelPeriodo) {
      throw new ConflictException(
        'La suscripción ya está programada para cancelarse al final del periodo',
      );
    }

    if (
      suscripcion.proveedor !== ProveedorPagoEnum.stripe ||
      !suscripcion.proveedorSubscriptionId
    ) {
      throw new BadRequestException(
        'La suscripción aún no tiene una suscripción Stripe activa para cancelar',
      );
    }

    await this.stripeService.cancelarAlFinalDelPeriodo(suscripcion.proveedorSubscriptionId);

    return this.prisma.suscripcion.update({
      where: {
        id: suscripcion.id,
      },
      data: {
        cancelarAlFinalDelPeriodo: true,
        canceladaEn: new Date(),
        siguienteCobroEn: null,
      },
    });
  }

  async reanudarSuscripcion(usuarioId: string) {
    const role = await this.obtenerRol(usuarioId);

    const suscripcion = await this.buscarSuscripcionActual(usuarioId, role);

    if (!suscripcion.cancelarAlFinalDelPeriodo) {
      throw new BadRequestException('La suscripción no está programada para cancelarse');
    }

    if (
      suscripcion.proveedor !== ProveedorPagoEnum.stripe ||
      !suscripcion.proveedorSubscriptionId
    ) {
      throw new BadRequestException(
        'La suscripción no tiene una suscripción Stripe activa para reanudar',
      );
    }

    await this.stripeService.reanudarSuscripcion(suscripcion.proveedorSubscriptionId);

    return this.prisma.suscripcion.update({
      where: {
        id: suscripcion.id,
      },
      data: {
        cancelarAlFinalDelPeriodo: false,
        canceladaEn: null,
        siguienteCobroEn: suscripcion.periodoActualFin,
      },
    });
  }

  async expirarSuscripcionesVencidas() {
    const ahora = new Date();

    return this.prisma.suscripcion.updateMany({
      where: {
        vitalicia: false,
        estado: {
          in: ESTADOS_SUSCRIPCION_ACTUAL,
        },
        periodoActualFin: {
          lt: ahora,
        },
      },
      data: {
        estado: EstadoSuscripcionEnum.expirada,
        siguienteCobroEn: null,
        cancelarAlFinalDelPeriodo: false,
      },
    });
  }

  async activarSuscripcionPorPagoConfirmado(
    pagoId: bigint,
    periodoInicio: Date,
    periodoFin: Date,
    siguienteCobroEn: Date | null,
  ): Promise<void> {
    return this.actualizarSuscripcionPorPagoHandler.activarPorPagoConfirmado(
      pagoId,
      periodoInicio,
      periodoFin,
      siguienteCobroEn,
    );
  }

  async marcarSuscripcionComoMorosaPorPagoFallido(pagoId: bigint): Promise<void> {
    return this.actualizarSuscripcionPorPagoHandler.marcarMorosaPorPagoFallido(pagoId);
  }

  private crearWhereSuscriptor(usuarioId: string, role: UserRole): SuscriptorWhere {
    if (role === UserRole.alumno || role === UserRole.alumnoConEntrenador) {
      return {
        alumnoId: usuarioId,
      };
    }

    if (role === UserRole.entrenador) {
      return {
        entrenadorId: usuarioId,
      };
    }

    throw new ForbiddenException('Rol no válido para suscripciones');
  }

  private async buscarSuscripcionActual(usuarioId: string, role: UserRole) {
    const where = this.crearWhereSuscriptor(usuarioId, role);

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

  private validarVigencia(suscripcion: {
    vitalicia: boolean;
    periodoActualFin: Date | null;
  }): void {
    if (suscripcion.vitalicia) {
      return;
    }

    if (!suscripcion.periodoActualFin || suscripcion.periodoActualFin <= new Date()) {
      throw new ForbiddenException('La suscripción ha expirado');
    }
  }

  private async buscarUltimoPago(suscripcionId: bigint) {
    const pago = await this.prisma.pago.findFirst({
      where: {
        suscripcionId,
      },
      orderBy: [
        {
          venceEn: 'desc',
        },
        {
          creadoEn: 'desc',
        },
      ],
    });

    if (!pago) {
      throw new NotFoundException('Estado de pago no encontrado para la suscripción');
    }

    return pago;
  }
}
