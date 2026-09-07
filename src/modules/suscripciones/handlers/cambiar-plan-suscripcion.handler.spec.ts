import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoSuscripcionEnum, UserRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { CambiarPlanSuscripcionHandler } from './cambiar-plan-suscripcion.handler';
import { CrearSuscripcionPendientePagoService } from '../services/crear-suscripcion-pendiente-pago.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
  },
  suscripcion: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  alumno: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  entrenador: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  planAlumno: {
    findUnique: jest.fn(),
  },
  planEntrenador: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const crearSuscripcionPendientePagoServiceMock = {
  ejecutar: jest.fn(),
};

describe('CambiarPlanSuscripcionHandler', () => {
  let handler: CambiarPlanSuscripcionHandler;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CambiarPlanSuscripcionHandler,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: CrearSuscripcionPendientePagoService,
          useValue: crearSuscripcionPendientePagoServiceMock,
        },
      ],
    }).compile();

    handler = module.get<CambiarPlanSuscripcionHandler>(CambiarPlanSuscripcionHandler);
  });

  describe('ejecutar', () => {
    it('debe rechazar el cambio cuando existe una suscripción Stripe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.entrenador,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: 'sub_xyz',
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: false,
        periodoActualFin: new Date('2999-01-01'),
      });

      await expect(handler.ejecutar(usuarioId, 2)).rejects.toThrow(
        new BadRequestException(
          'No puedes cambiar de plan mientras exista una suscripción Stripe. Primero implementa la actualización de Stripe con prorrateo o cancelación al final del periodo.',
        ),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId, 2)).rejects.toThrow(
        new NotFoundException('Usuario no encontrado'),
      );

      expect(prismaMock.suscripcion.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe una suscripción actual', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId, 2)).rejects.toThrow(
        new NotFoundException('Suscripción vigente no encontrada'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el alumno ya tiene asignado el plan nuevo', async () => {
      const planActualId = 1;
      const planNuevoId = 2;

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return callback(prismaMock);
        },
      );

      prismaMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planNuevoId,
      });

      await expect(handler.ejecutar(usuarioId, planNuevoId)).rejects.toThrow(
        new ConflictException('Ya tienes asignado este plan'),
      );

      expect(prismaMock.planAlumno.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.suscripcion.updateMany).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el nuevo plan de alumno no existe o está inactivo', async () => {
      const planActualId = 1;
      const planNuevoId = 2;

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return callback(prismaMock);
        },
      );

      prismaMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planActualId,
      });

      prismaMock.planAlumno.findUnique.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId, planNuevoId)).rejects.toThrow(
        new NotFoundException('Plan de alumno no encontrado o inactivo'),
      );

      expect(prismaMock.suscripcion.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.alumno.update).not.toHaveBeenCalled();
    });

    it('debe cambiar al alumno a un plan gratuito', async () => {
      const planActualId = 1;
      const planNuevoId = 2;

      const nuevoPlanGratis = {
        id: planNuevoId,
        nombre: 'Plan gratuito',
        precio: 0,
        moneda: 'mxn',
        proveedorPriceId: null,
        duracionUnidad: null,
        duracionCantidad: null,
        esGratuito: true,
        estaActivo: true,
      };

      const suscripcionNueva = {
        id: BigInt(10),
        alumnoId: usuarioId,
        planAlumnoId: planNuevoId,
        estado: EstadoSuscripcionEnum.activa,
        vitalicia: true,
      };

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return callback(prismaMock);
        },
      );

      prismaMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planActualId,
      });

      prismaMock.planAlumno.findUnique.mockResolvedValue(nuevoPlanGratis);

      prismaMock.suscripcion.updateMany.mockResolvedValue({
        count: 1,
      });

      prismaMock.alumno.update.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planNuevoId,
      });

      prismaMock.suscripcion.create.mockResolvedValue(suscripcionNueva);

      const resultado = await handler.ejecutar(usuarioId, planNuevoId);

      expect(prismaMock.suscripcion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            alumnoId: usuarioId,
            estado: {
              in: [
                EstadoSuscripcionEnum.prueba,
                EstadoSuscripcionEnum.activa,
                EstadoSuscripcionEnum.morosa,
              ],
            },
          },
          data: expect.objectContaining({
            estado: EstadoSuscripcionEnum.cancelada,
            siguienteCobroEn: null,
            cancelarAlFinalDelPeriodo: false,
          }),
        }),
      );

      expect(prismaMock.alumno.update).toHaveBeenCalledWith({
        where: {
          idUsuario: usuarioId,
        },
        data: {
          idPlan: planNuevoId,
        },
      });

      expect(prismaMock.suscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alumnoId: usuarioId,
            planAlumnoId: planNuevoId,
            estado: EstadoSuscripcionEnum.activa,
            vitalicia: true,
            planNombreSnapshot: 'Plan gratuito',
            monedaSnapshot: 'MXN',
          }),
        }),
      );

      expect(crearSuscripcionPendientePagoServiceMock.ejecutar).not.toHaveBeenCalled();

      expect(resultado).toEqual(suscripcionNueva);
    });

    it('debe delegar al servicio compartido cuando el alumno cambia a un plan de pago', async () => {
      const planActualId = 1;
      const planNuevoId = 2;

      const nuevoPlanPago = {
        id: planNuevoId,
        nombre: 'Plan Pro',
        precio: 199,
        moneda: 'mxn',
        proveedorPriceId: 'price_pro_123',
        duracionUnidad: 'mes',
        duracionCantidad: 1,
        esGratuito: false,
        esVitalicio: false,
        cobraRecurrentemente: true,
        estaActivo: true,
      };

      const suscripcionPendiente = {
        id: BigInt(15),
        alumnoId: usuarioId,
        estado: EstadoSuscripcionEnum.morosa,
      };

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: typeof prismaMock) => Promise<unknown>) => {
          return callback(prismaMock);
        },
      );

      prismaMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planActualId,
      });

      prismaMock.planAlumno.findUnique.mockResolvedValue(nuevoPlanPago);

      prismaMock.suscripcion.updateMany.mockResolvedValue({
        count: 1,
      });

      prismaMock.alumno.update.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planNuevoId,
      });

      crearSuscripcionPendientePagoServiceMock.ejecutar.mockResolvedValue({
        suscripcion: suscripcionPendiente,
      });

      const resultado = await handler.ejecutar(usuarioId, planNuevoId);

      expect(crearSuscripcionPendientePagoServiceMock.ejecutar).toHaveBeenCalledWith(
        prismaMock,
        {
          alumnoId: usuarioId,
          planAlumnoId: planNuevoId,
        },
        nuevoPlanPago,
        expect.any(Date),
      );

      expect(resultado).toEqual(suscripcionPendiente);
    });
  });
});
