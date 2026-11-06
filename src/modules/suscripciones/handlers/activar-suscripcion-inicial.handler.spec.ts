import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoSuscripcionEnum,
  Prisma,
  UnidadPeriodoEnum,
  UserRole,
} from '@prisma/client';

import { ActivarSuscripcionInicialHandler } from './activar-suscripcion-inicial.handler';
import { PrismaService } from '../../../prisma/prisma.service';
import { CrearSuscripcionPendientePagoService } from '../services/crear-suscripcion-pendiente-pago.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

describe('ActivarSuscripcionInicialHandler', () => {
  let handler: ActivarSuscripcionInicialHandler;
  let prismaMock: { $transaction: jest.Mock };
  let crearSuscripcionPendientePagoServiceMock: { ejecutar: jest.Mock };

  const txMock = {
    usuario: {
      findUnique: jest.fn(),
    },
    suscripcion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    alumno: {
      findUnique: jest.fn(),
    },
    planAlumno: {
      findUnique: jest.fn(),
    },
    entrenador: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    planEntrenador: {
      findUnique: jest.fn(),
    },
  };

  const suscripcionResultadoBase = (overrides: Record<string, unknown> = {}) => ({
    id: BigInt(1),
    alumnoId: null,
    entrenadorId: null,
    estado: EstadoSuscripcionEnum.activa,
    planAlumnoId: null,
    planEntrenadorId: null,
    periodoActualInicio: expect.any(Date),
    periodoActualFin: null,
    siguienteCobroEn: null,
    vitalicia: true,
    proveedorPrecioIdSnapshot: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      $transaction: jest.fn(
        (cb: (tx: typeof txMock) => Promise<unknown>): Promise<unknown> => cb(txMock),
      ),
    };

    crearSuscripcionPendientePagoServiceMock = {
      ejecutar: jest.fn().mockResolvedValue({
        suscripcion: { id: BigInt(2), estado: EstadoSuscripcionEnum.morosa },
        pagoId: BigInt(50),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivarSuscripcionInicialHandler,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: CrearSuscripcionPendientePagoService,
          useValue: crearSuscripcionPendientePagoServiceMock,
        },
      ],
    }).compile();

    handler = module.get<ActivarSuscripcionInicialHandler>(ActivarSuscripcionInicialHandler);
  });

  it('debe lanzar NotFoundException si el usuario no existe', async () => {
    txMock.usuario.findUnique.mockResolvedValue(null);

    await expect(handler.ejecutar(usuarioId)).rejects.toThrow(
      new NotFoundException('Usuario no encontrado'),
    );
  });

  it('debe lanzar ForbiddenException si el rol no es apto para suscripciones', async () => {
    txMock.usuario.findUnique.mockResolvedValue({ role: UserRole.admin });

    await expect(handler.ejecutar(usuarioId)).rejects.toThrow(
      new ForbiddenException('Rol no válido para suscripciones'),
    );
  });

  describe('alumno', () => {
    beforeEach(() => {
      txMock.usuario.findUnique.mockResolvedValue({ role: UserRole.alumno });
    });

    it('debe devolver la suscripción existente sin crear una nueva', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(
        suscripcionResultadoBase({ estado: EstadoSuscripcionEnum.activa, vitalicia: true }),
      );

      const result = await handler.ejecutar(usuarioId);

      expect(txMock.suscripcion.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        suscripcion: expect.objectContaining({
          estado: EstadoSuscripcionEnum.activa,
        }),
        creada: false,
      });
    });

    it('debe lanzar NotFoundException si el alumno no existe', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.alumno.findUnique.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId)).rejects.toThrow(
        new NotFoundException('Alumno no encontrado'),
      );
    });

    it('debe lanzar NotFoundException si el plan está inactivo', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.alumno.findUnique.mockResolvedValue({ idPlan: 3 });
      txMock.planAlumno.findUnique.mockResolvedValue(null);

      await expect(handler.ejecutar(usuarioId)).rejects.toThrow(
        new NotFoundException('Plan del alumno no encontrado o inactivo'),
      );
    });

    it('debe crear una suscripción vitalicia activa si el plan es gratuito', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.alumno.findUnique.mockResolvedValue({ idPlan: 1 });
      txMock.planAlumno.findUnique.mockResolvedValue({
        id: 1,
        estaActivo: true,
        esGratuito: true,
        esVitalicio: true,
        nombre: 'Plan Free',
        precio: new Prisma.Decimal(0),
        moneda: 'MXN',
        proveedorPrecioId: null,
        duracionUnidad: null,
        duracionCantidad: null,
      });
      txMock.suscripcion.create.mockResolvedValue(
        suscripcionResultadoBase({ proveedorPrecioIdSnapshot: null }),
      );

      const result = await handler.ejecutar(usuarioId);

      expect(txMock.suscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alumnoId: usuarioId,
            planAlumnoId: 1,
            estado: EstadoSuscripcionEnum.activa,
            vitalicia: true,
          }),
        }),
      );

      expect(result).toEqual({
        suscripcion: expect.objectContaining({ estado: EstadoSuscripcionEnum.activa }),
        creada: true,
      });
    });

    it('debe delegar en el plan de pago y devolver el pago creado', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.alumno.findUnique.mockResolvedValue({ idPlan: 2 });
      txMock.planAlumno.findUnique.mockResolvedValue({
        id: 2,
        estaActivo: true,
        esGratuito: false,
        esVitalicio: false,
        nombre: 'Plan Pro',
        precio: new Prisma.Decimal(99),
        moneda: 'MXN',
        proveedorPrecioId: 'price_1',
        duracionUnidad: UnidadPeriodoEnum.mes,
        duracionCantidad: 1,
      });

      const result = await handler.ejecutar(usuarioId);

      expect(crearSuscripcionPendientePagoServiceMock.ejecutar).toHaveBeenCalledWith(
        expect.anything(),
        {
          alumnoId: usuarioId,
          planAlumnoId: 2,
        },
        expect.objectContaining({ id: 2 }),
        expect.any(Date),
      );

      expect(result).toEqual({
        suscripcion: { id: BigInt(2), estado: EstadoSuscripcionEnum.morosa },
        creada: true,
        pagoId: BigInt(50),
      });
    });
  });

  describe('entrenador', () => {
    beforeEach(() => {
      txMock.usuario.findUnique.mockResolvedValue({ role: UserRole.entrenador });
    });

    it('debe crear una suscripción vitalicia activa con un plan gratuito vitalicio', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.entrenador.findUnique.mockResolvedValue({ idPlan: 1 });
      txMock.planEntrenador.findUnique.mockResolvedValue({
        id: 1,
        estaActivo: true,
        esGratuito: true,
        esVitalicio: true,
        nombre: 'Plan Free',
        precio: new Prisma.Decimal(0),
        moneda: 'MXN',
        proveedorPrecioId: null,
        duracionUnidad: null,
        duracionCantidad: null,
      });
      txMock.suscripcion.create.mockResolvedValue(
        suscripcionResultadoBase({ entrenadorId: usuarioId, vitalicia: true }),
      );

      const result = await handler.ejecutar(usuarioId);

      expect(txMock.suscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entrenadorId: usuarioId,
            estado: EstadoSuscripcionEnum.activa,
            vitalicia: true,
          }),
        }),
      );
      expect(result.creada).toBe(true);
    });

    it('debe crear una suscripción de prueba si el plan gratuito no es vitalicio', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.entrenador.findUnique.mockResolvedValue({ idPlan: 2 });
      txMock.planEntrenador.findUnique.mockResolvedValue({
        id: 2,
        estaActivo: true,
        esGratuito: true,
        esVitalicio: false,
        nombre: 'Plan Trial',
        precio: new Prisma.Decimal(0),
        moneda: 'MXN',
        proveedorPrecioId: null,
        duracionUnidad: UnidadPeriodoEnum.semana,
        duracionCantidad: 2,
      });
      txMock.suscripcion.create.mockResolvedValue(
        suscripcionResultadoBase({
          entrenadorId: usuarioId,
          estado: EstadoSuscripcionEnum.prueba,
          vitalicia: false,
        }),
      );

      const result = await handler.ejecutar(usuarioId);

      expect(txMock.entrenador.update).toHaveBeenCalledWith({
        where: { idUsuario: usuarioId },
        data: { pruebaUtilizada: true },
      });
      expect(txMock.suscripcion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoSuscripcionEnum.prueba,
            vitalicia: false,
            periodoActualFin: expect.any(Date),
            siguienteCobroEn: expect.any(Date),
          }),
        }),
      );
      expect(result.creada).toBe(true);
    });

    it('debe lanzar BadRequestException si el plan de prueba no tiene duración', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.entrenador.findUnique.mockResolvedValue({ idPlan: 2 });
      txMock.planEntrenador.findUnique.mockResolvedValue({
        id: 2,
        estaActivo: true,
        esGratuito: true,
        esVitalicio: false,
        nombre: 'Plan Trial',
        precio: new Prisma.Decimal(0),
        moneda: 'MXN',
        proveedorPrecioId: null,
        duracionUnidad: null,
        duracionCantidad: null,
      });

      await expect(handler.ejecutar(usuarioId)).rejects.toThrow(
        new BadRequestException('El plan no tiene una duración configurada'),
      );
    });

    it('debe delegar en el plan de pago para un entrenador', async () => {
      txMock.suscripcion.findFirst.mockResolvedValue(null);
      txMock.entrenador.findUnique.mockResolvedValue({ idPlan: 3 });
      txMock.planEntrenador.findUnique.mockResolvedValue({
        id: 3,
        estaActivo: true,
        esGratuito: false,
        esVitalicio: false,
        nombre: 'Pro',
        precio: new Prisma.Decimal(199),
        moneda: 'MXN',
        proveedorPrecioId: 'price_2',
        duracionUnidad: UnidadPeriodoEnum.mes,
        duracionCantidad: 1,
      });

      const result = await handler.ejecutar(usuarioId);

      expect(crearSuscripcionPendientePagoServiceMock.ejecutar).toHaveBeenCalledWith(
        expect.anything(),
        {
          entrenadorId: usuarioId,
          planEntrenadorId: 3,
        },
        expect.objectContaining({ id: 3 }),
        expect.any(Date),
      );

      expect(result.creada).toBe(true);
      expect(result.pagoId).toBe(BigInt(50));
    });
  });
});