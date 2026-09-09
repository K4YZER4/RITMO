import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoSuscripcionEnum, UserRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { StripeService } from '../../stripe/stripe.service';
import { CambiarPlanSuscripcionHandler } from './cambiar-plan-suscripcion.handler';
import { CrearSuscripcionPendientePagoService } from '../services/crear-suscripcion-pendiente-pago.service';
import { MODOS_CAMBIO_PLAN } from '../../../common/constants/modo-cambio';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const prismaMock = {
  usuario: {
    findUnique: jest.fn(),
  },
  suscripcion: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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

const stripeServiceMock = {
  cancelarInmediatamente: jest.fn(),
  cancelarAlFinalDelPeriodo: jest.fn(),
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
        {
          provide: StripeService,
          useValue: stripeServiceMock,
        },
      ],
    }).compile();

    handler = module.get<CambiarPlanSuscripcionHandler>(CambiarPlanSuscripcionHandler);
  });

  describe('ejecutar', () => {
    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId, 2, MODOS_CAMBIO_PLAN.INSTANTANEO)).rejects.toThrow(
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

      await expect(handler.ejecutar(usuarioId, 2, MODOS_CAMBIO_PLAN.INSTANTANEO)).rejects.toThrow(
        new NotFoundException('Suscripción vigente no encontrada'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el alumno ya tiene asignado el plan nuevo', async () => {
      const planNuevoId = 2;

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: null,
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
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

      await expect(handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.INSTANTANEO)).rejects.toThrow(
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
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
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

      await expect(handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.INSTANTANEO)).rejects.toThrow(
        new NotFoundException('Plan de alumno no encontrado o inactivo'),
      );

      expect(prismaMock.suscripcion.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.alumno.update).not.toHaveBeenCalled();
    });

    it('debe cambiar al alumno a un plan gratuito sin suscripción Stripe', async () => {
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
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
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

      const resultado = await handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.INSTANTANEO);

      expect(stripeServiceMock.cancelarInmediatamente).not.toHaveBeenCalled();
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

    it('debe delegar al servicio compartido cuando el alumno cambia a un plan de pago sin suscripción Stripe', async () => {
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
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
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

      const resultado = await handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.INSTANTANEO);

      expect(stripeServiceMock.cancelarInmediatamente).not.toHaveBeenCalled();

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

    it('debe cancelar la suscripción Stripe y aplicar el cambio cuando el modo es instantaneo', async () => {
      const planActualId = 1;
      const planNuevoId = 2;
      const stripeSubscriptionId = 'sub_xyz';

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
        proveedorSubscriptionId: stripeSubscriptionId,
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
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

      const resultado = await handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.INSTANTANEO);

      expect(stripeServiceMock.cancelarInmediatamente).toHaveBeenCalledWith(stripeSubscriptionId);
      expect(stripeServiceMock.cancelarAlFinalDelPeriodo).not.toHaveBeenCalled();

      expect(prismaMock.suscripcion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            alumnoId: usuarioId,
          }),
        }),
      );

      expect(resultado).toEqual(suscripcionNueva);
    });

    it('debe programar el cambio al final del periodo cuando el modo es finalPeriodo', async () => {
      const planActualId = 1;
      const planNuevoId = 2;
      const stripeSubscriptionId = 'sub_xyz';

      const nuevoPlanActivo = {
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

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: stripeSubscriptionId,
        alumnoId: usuarioId,
        entrenadorId: null,
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      prismaMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: planActualId,
      });

      prismaMock.planAlumno.findUnique.mockResolvedValue(nuevoPlanActivo);

      prismaMock.suscripcion.update.mockResolvedValue({
        id: BigInt(1),
        planAlumnoPendienteId: planNuevoId,
        cancelarAlFinalDelPeriodo: true,
      });

      const resultado = await handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.FINAL_PERIODO);

      expect(stripeServiceMock.cancelarAlFinalDelPeriodo).toHaveBeenCalledWith(
        stripeSubscriptionId,
      );
      expect(stripeServiceMock.cancelarInmediatamente).not.toHaveBeenCalled();

      expect(prismaMock.suscripcion.update).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        data: {
          planAlumnoPendienteId: planNuevoId,
          cancelarAlFinalDelPeriodo: true,
          siguienteCobroEn: null,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();

      expect(resultado).toEqual({
        programado: true,
        modoCambio: MODOS_CAMBIO_PLAN.FINAL_PERIODO,
        idPlanPendiente: planNuevoId,
        suscripcionId: '1',
      });
    });

    it('debe lanzar ConflictException si ya existe un cambio pendiente en modo finalPeriodo', async () => {
      const planNuevoId = 2;
      const stripeSubscriptionId = 'sub_xyz';

      prismaMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });

      prismaMock.suscripcion.findFirst.mockResolvedValue({
        id: BigInt(1),
        proveedorSubscriptionId: stripeSubscriptionId,
        alumnoId: usuarioId,
        entrenadorId: null,
        planAlumnoPendienteId: 3,
        planEntrenadorPendienteId: null,
        estado: EstadoSuscripcionEnum.activa,
      });

      await expect(handler.ejecutar(usuarioId, planNuevoId, MODOS_CAMBIO_PLAN.FINAL_PERIODO)).rejects.toThrow(
        new ConflictException(
          'Ya existe un cambio de plan programado al final del periodo actual',
        ),
      );

      expect(stripeServiceMock.cancelarAlFinalDelPeriodo).not.toHaveBeenCalled();
      expect(prismaMock.suscripcion.update).not.toHaveBeenCalled();
    });
  });

  describe('aplicarCambioPlanDesdeProveedor', () => {
    it('debe lanzar NotFoundException si la suscripción no existe', async () => {
      prismaMock.suscripcion.findUnique.mockResolvedValue(null);

      await expect(handler.aplicarCambioPlanDesdeProveedor(BigInt(1))).rejects.toThrow(
        new NotFoundException('Suscripción no encontrada'),
      );
    });

    it('debe retornar sin aplicar si no hay plan pendiente', async () => {
      prismaMock.suscripcion.findUnique.mockResolvedValue({
        id: BigInt(1),
        alumnoId: usuarioId,
        entrenadorId: null,
        planAlumnoPendienteId: null,
        planEntrenadorPendienteId: null,
      });

      const resultado = await handler.aplicarCambioPlanDesdeProveedor(BigInt(1));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();

      expect(resultado).toEqual({
        aplicado: false,
        motivo: 'La suscripción no tiene un cambio de plan pendiente',
      });
    });

    it('debe aplicar el cambio de plan pendiente de un alumno y limpiar el campo pendiente', async () => {
      const planActualId = 1;
      const planNuevoId = 2;
      const suscripcionId = BigInt(1);

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

      prismaMock.suscripcion.findUnique.mockResolvedValue({
        id: suscripcionId,
        alumnoId: usuarioId,
        entrenadorId: null,
        planAlumnoPendienteId: planNuevoId,
        planEntrenadorPendienteId: null,
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

      const resultado = await handler.aplicarCambioPlanDesdeProveedor(suscripcionId);

      expect(prismaMock.suscripcion.update).toHaveBeenCalledWith({
        where: {
          id: suscripcionId,
        },
        data: {
          planAlumnoPendienteId: null,
          planEntrenadorPendienteId: null,
        },
      });

      expect(prismaMock.suscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alumnoId: usuarioId,
            planAlumnoId: planNuevoId,
            estado: EstadoSuscripcionEnum.activa,
            vitalicia: true,
          }),
        }),
      );

      expect(resultado).toEqual({
        aplicado: true,
        suscripcionId: '1',
        idPlanNuevo: planNuevoId,
      });
    });
  });
});