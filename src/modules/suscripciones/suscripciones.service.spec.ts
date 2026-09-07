import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoPagoEnum, EstadoSuscripcionEnum, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { ActivarSuscripcionInicialHandler } from './handlers/activar-suscripcion-inicial.handler';
import { ActualizarSuscripcionPorPagoHandler } from './handlers/actualizar-suscripcion-por-pago.handler';
import { CambiarPlanSuscripcionHandler } from './handlers/cambiar-plan-suscripcion.handler';
import { SuscripcionesService } from './suscripciones.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
  },
  suscripcion: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  pago: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const stripeServiceMock = {
  cancelarAlFinalDelPeriodo: jest.fn(),
  reanudarSuscripcion: jest.fn(),
};

const activarSuscripcionInicialHandlerMock = {
  ejecutar: jest.fn(),
};

const actualizarSuscripcionPorPagoHandlerMock = {
  activarPorPagoConfirmado: jest.fn(),
  marcarMorosaPorPagoFallido: jest.fn(),
};

const cambiarPlanSuscripcionHandlerMock = {
  ejecutar: jest.fn(),
};

describe('SuscripcionesService', () => {
  let service: SuscripcionesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuscripcionesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: StripeService,
          useValue: stripeServiceMock,
        },
        {
          provide: ActivarSuscripcionInicialHandler,
          useValue: activarSuscripcionInicialHandlerMock,
        },
        {
          provide: ActualizarSuscripcionPorPagoHandler,
          useValue: actualizarSuscripcionPorPagoHandlerMock,
        },
        {
          provide: CambiarPlanSuscripcionHandler,
          useValue: cambiarPlanSuscripcionHandlerMock,
        },
      ],
    }).compile();

    service = module.get<SuscripcionesService>(SuscripcionesService);
  });

  describe('validarAccesoSuscripcion', () => {
    it('debe permitir el acceso con una suscripción activa vigente', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      const result = await service.validarAccesoSuscripcion(usuarioId);

      expect(result.estado).toBe(EstadoSuscripcionEnum.activa);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(service.validarAccesoSuscripcion(usuarioId)).rejects.toThrow(
        new NotFoundException('Usuario no encontrado'),
      );

      expect(prismaMock.suscripcion.findFirst).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si la suscripción está morosa', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.morosa,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      await expect(service.validarAccesoSuscripcion(usuarioId)).rejects.toThrow(
        new ForbiddenException(
          'Tu pago está pendiente o falló. Completa o actualiza el pago para continuar.',
        ),
      );
    });

    it('debe lanzar NotFoundException si no hay suscripción vigente', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.entrenador,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue(null);

      await expect(service.validarAccesoSuscripcion(usuarioId)).rejects.toThrow(
        new NotFoundException('Suscripción vigente no encontrada'),
      );
    });

    it('debe lanzar ForbiddenException si la suscripción ha expirado', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: false,
        periodoActualFin: new Date('2020-01-01'),
      });

      await expect(service.validarAccesoSuscripcion(usuarioId)).rejects.toThrow(
        new ForbiddenException('La suscripción ha expirado'),
      );
    });
  });

  describe('obtenerEstadoPago', () => {
    it('debe devolver pagado si la suscripción es vitalicia', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: true,
        periodoActualFin: new Date('2999-01-01'),
      });

      const result = await service.obtenerEstadoPago(usuarioId);

      expect(result).toEqual({
        estado: EstadoPagoEnum.pagado,
      });

      expect(prismaMock.pago.findFirst).not.toHaveBeenCalled();
    });

    it('debe devolver pagado si la suscripción está en periodo de prueba', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.entrenador,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.prueba,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      const result = await service.obtenerEstadoPago(usuarioId);

      expect(result).toEqual({
        estado: EstadoPagoEnum.pagado,
      });

      expect(prismaMock.pago.findFirst).not.toHaveBeenCalled();
    });

    it('debe devolver el estado del último pago para una suscripción de pago', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      prismaMock.pago.findFirst.mockResolvedValue({
        id: BigInt(2),
        estado: EstadoPagoEnum.pagado,
      });

      const result = await service.obtenerEstadoPago(usuarioId);

      expect(prismaMock.pago.findFirst).toHaveBeenCalledWith({
        where: {
          suscripcionId: BigInt(1),
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

      expect(result).toEqual({
        estado: EstadoPagoEnum.pagado,
        pagoId: BigInt(2),
      });
    });

    it('debe lanzar NotFoundException si no existe un pago para una suscripción de pago', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      prismaMock.pago.findFirst.mockResolvedValue(null);

      await expect(service.obtenerEstadoPago(usuarioId)).rejects.toThrow(
        new NotFoundException('Estado de pago no encontrado para la suscripción'),
      );
    });
  });

  describe('cambiarPlan', () => {
    it('debe delegar el cambio de plan al handler', async () => {
      const idPlanNuevo = 2;

      const resultadoEsperado = {
        id: BigInt(10),
      };

      cambiarPlanSuscripcionHandlerMock.ejecutar.mockResolvedValue(resultadoEsperado);

      const result = await service.cambiarPlan(usuarioId, idPlanNuevo);

      expect(cambiarPlanSuscripcionHandlerMock.ejecutar).toHaveBeenCalledWith(
        usuarioId,
        idPlanNuevo,
      );

      expect(result).toBe(resultadoEsperado);
    });
  });

  describe('activarSuscripcionInicial', () => {
    it('debe delegar la activación inicial al handler', async () => {
      const resultadoEsperado = {
        suscripcion: {
          id: BigInt(1),
        },
        creada: true,
      };

      activarSuscripcionInicialHandlerMock.ejecutar.mockResolvedValue(resultadoEsperado);

      const result = await service.activarSuscripcionInicial(usuarioId);

      expect(activarSuscripcionInicialHandlerMock.ejecutar).toHaveBeenCalledWith(usuarioId, undefined);

      expect(result).toBe(resultadoEsperado);
    });
  });

  describe('actualizar estado por pago', () => {
    it('debe delegar la activación cuando el pago fue confirmado', async () => {
      const pagoId = BigInt(1);
      const periodoInicio = new Date('2026-01-01');
      const periodoFin = new Date('2026-02-01');
      const siguienteCobroEn = new Date('2026-02-01');

      await service.activarSuscripcionPorPagoConfirmado(
        pagoId,
        periodoInicio,
        periodoFin,
        siguienteCobroEn,
      );

      expect(actualizarSuscripcionPorPagoHandlerMock.activarPorPagoConfirmado).toHaveBeenCalledWith(
        pagoId,
        periodoInicio,
        periodoFin,
        siguienteCobroEn,
      );
    });

    it('debe delegar el estado moroso cuando el pago falla', async () => {
      const pagoId = BigInt(1);

      await service.marcarSuscripcionComoMorosaPorPagoFallido(pagoId);

      expect(
        actualizarSuscripcionPorPagoHandlerMock.marcarMorosaPorPagoFallido,
      ).toHaveBeenCalledWith(pagoId);
    });
  });
});
