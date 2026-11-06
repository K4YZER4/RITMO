import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoPagoEnum,
  EstadoSuscripcionEnum,
  Prisma,
  ProveedorPagoEnum,
  UnidadPeriodoEnum,
} from '@prisma/client';

import { CrearSuscripcionPendientePagoService } from './crear-suscripcion-pendiente-pago.service';
import { sumarUnidadCalendar } from '../../../common/utils/fecha.util';
import { StripeService } from '../../stripe/stripe.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const planPago = {
  id: 1,
  nombre: 'Plan Pro',
  precio: new Prisma.Decimal('199.00'),
  moneda: 'MXN',
  proveedorPrecioId: 'price_1',
  duracionUnidad: UnidadPeriodoEnum.mes,
  duracionCantidad: 1,
  esVitalicio: false,
  esGratuito: false,
  cobraRecurrentemente: true,
  periodoPrueba: null as number | null,
  unidadPeriodoPrueba: null as UnidadPeriodoEnum | null,
};

describe('CrearSuscripcionPendientePagoService', () => {
  let service: CrearSuscripcionPendientePagoService;
  let stripeServiceMock: { crearOActualizarCustomer: jest.Mock };

  const txMock = {
    alumno: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entrenador: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    suscripcion: {
      create: jest.fn(),
    },
    pago: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    stripeServiceMock = {
      crearOActualizarCustomer: jest
        .fn()
        .mockResolvedValue({ id: 'cus_nuevo', email: 'ana@test.com' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrearSuscripcionPendientePagoService,
        { provide: StripeService, useValue: stripeServiceMock },
      ],
    }).compile();

    service = module.get<CrearSuscripcionPendientePagoService>(CrearSuscripcionPendientePagoService);
  });

  it('debe lanzar BadRequestException si el plan no tiene proveedorPrecioId', async () => {
    await expect(
      service.ejecutar(txMock as never, { alumnoId: usuarioId }, { ...planPago, proveedorPrecioId: null }, new Date()),
    ).rejects.toThrow(
      new BadRequestException('El plan de pago no tiene proveedorPrecioId configurado en Stripe'),
    );
  });

  it('debe lanzar BadRequestException si el alumno no existe', async () => {
    txMock.alumno.findUnique.mockResolvedValue(null);

    await expect(
      service.ejecutar(txMock as never, { alumnoId: usuarioId }, planPago, new Date()),
    ).rejects.toThrow(new BadRequestException('Alumno no encontrado'));
  });

  it('debe lanzar BadRequestException si no hay titular válido', async () => {
    await expect(service.ejecutar(txMock as never, {}, planPago, new Date())).rejects.toThrow(
      new BadRequestException('La suscripción no tiene un titular válido'),
    );
  });

  it('debe crear una suscripción morosa sin prueba y sin forzar customer de Stripe', async () => {
    txMock.alumno.findUnique.mockResolvedValue({
      pruebaUtilizada: false,
      proveedorCustomerId: null,
    });
    txMock.suscripcion.create.mockResolvedValue({
      id: BigInt(100),
      alumnoId: usuarioId,
      entrenadorId: null,
      estado: EstadoSuscripcionEnum.morosa,
      planAlumnoId: 1,
      planEntrenadorId: null,
      periodoActualInicio: new Date(),
      periodoActualFin: null,
      siguienteCobroEn: null,
      vitalicia: false,
      proveedorPrecioIdSnapshot: 'price_1',
    });
    txMock.pago.create.mockResolvedValue({ id: BigInt(200) });

    const ahora = new Date('2026-09-01T12:00:00.000Z');

    const result = await service.ejecutar(txMock as never, { alumnoId: usuarioId }, planPago, ahora);

    expect(txMock.suscripcion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alumnoId: usuarioId,
          estado: EstadoSuscripcionEnum.morosa,
          proveedorPrecioIdSnapshot: 'price_1',
          proveedorCustomerId: null,
          vitalicia: false,
        }),
      }),
    );

    expect(txMock.pago.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          suscripcionId: BigInt(100),
          monto: new Prisma.Decimal('199.00'),
          moneda: 'MXN',
          estado: EstadoPagoEnum.pendiente,
          venceEn: sumarUnidadCalendar(ahora, 1, UnidadPeriodoEnum.mes),
          proveedor: ProveedorPagoEnum.stripe,
        }),
      }),
    );

    expect(stripeServiceMock.crearOActualizarCustomer).not.toHaveBeenCalled();

    expect(result).toEqual({
      suscripcion: expect.objectContaining({ id: BigInt(100) }),
      pagoId: BigInt(200),
    });
  });

  it('debe conservar el proveedorCustomerId existente de la cuenta', async () => {
    txMock.alumno.findUnique.mockResolvedValue({
      pruebaUtilizada: false,
      proveedorCustomerId: 'cus_1',
    });
    txMock.suscripcion.create.mockResolvedValue({ id: BigInt(100) });
    txMock.pago.create.mockResolvedValue({ id: BigInt(200) });

    await service.ejecutar(txMock as never, { alumnoId: usuarioId }, planPago, new Date());

    expect(txMock.suscripcion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proveedorCustomerId: 'cus_1' }),
      }),
    );
  });

  it('debe crear suscripción de prueba, generar customer y marcar la prueba como utilizada', async () => {
    const planConPrueba: typeof planPago = {
      ...planPago,
      periodoPrueba: 7,
      unidadPeriodoPrueba: UnidadPeriodoEnum.dia,
    };

    txMock.alumno.findUnique.mockResolvedValue({
      pruebaUtilizada: false,
      proveedorCustomerId: null,
    });
    txMock.usuario.findUnique.mockResolvedValue({
      correo: 'ana@test.com',
      nombre: 'Ana',
    });
    txMock.suscripcion.create.mockResolvedValue({
      id: BigInt(100),
      alumnoId: usuarioId,
      entrenadorId: null,
      estado: EstadoSuscripcionEnum.prueba,
      planAlumnoId: 1,
      planEntrenadorId: null,
      periodoActualInicio: new Date(),
      periodoActualFin: null,
      siguienteCobroEn: null,
      vitalicia: false,
      proveedorPrecioIdSnapshot: 'price_1',
    });
    txMock.pago.create.mockResolvedValue({ id: BigInt(200) });

    const ahora = new Date('2026-09-01T12:00:00.000Z');
    const trialEnd = sumarUnidadCalendar(ahora, 7, UnidadPeriodoEnum.dia);

    const result = await service.ejecutar(
      txMock as never,
      { alumnoId: usuarioId },
      planConPrueba,
      ahora,
    );

    expect(stripeServiceMock.crearOActualizarCustomer).toHaveBeenCalledWith({
      usuarioId,
      correo: 'ana@test.com',
      nombre: 'Ana',
    });

    expect(txMock.suscripcion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoSuscripcionEnum.prueba,
          periodoActualFin: trialEnd,
          siguienteCobroEn: trialEnd,
          proveedorCustomerId: 'cus_nuevo',
        }),
      }),
    );

    expect(txMock.alumno.update).toHaveBeenCalledTimes(2);
    expect(txMock.alumno.update).toHaveBeenCalledWith({
      where: { idUsuario: usuarioId },
      data: { proveedorCustomerId: 'cus_nuevo' },
    });
    expect(txMock.alumno.update).toHaveBeenCalledWith({
      where: { idUsuario: usuarioId },
      data: { pruebaUtilizada: true },
    });

    expect(result.trialEnd).toEqual(trialEnd);
    expect(result.customerId).toBe('cus_nuevo');
  });

  it('debe lanzar BadRequestException si el usuario no existe al crear el customer', async () => {
    const planConPrueba: typeof planPago = {
      ...planPago,
      periodoPrueba: 7,
      unidadPeriodoPrueba: UnidadPeriodoEnum.dia,
    };

    txMock.alumno.findUnique.mockResolvedValue({
      pruebaUtilizada: false,
      proveedorCustomerId: null,
    });
    txMock.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.ejecutar(txMock as never, { alumnoId: usuarioId }, planConPrueba, new Date()),
    ).rejects.toThrow(new BadRequestException('Usuario no encontrado'));
  });

  it('debe marcar la prueba como utilizada en la cuenta del entrenador', async () => {
    const planConPrueba: typeof planPago = {
      ...planPago,
      periodoPrueba: 7,
      unidadPeriodoPrueba: UnidadPeriodoEnum.dia,
    };

    txMock.entrenador.findUnique.mockResolvedValue({
      pruebaUtilizada: false,
      proveedorCustomerId: 'cus_5',
    });
    txMock.suscripcion.create.mockResolvedValue({ id: BigInt(100) });
    txMock.pago.create.mockResolvedValue({ id: BigInt(200) });

    await service.ejecutar(
      txMock as never,
      { entrenadorId: usuarioId },
      planConPrueba,
      new Date(),
    );

    expect(stripeServiceMock.crearOActualizarCustomer).not.toHaveBeenCalled();
    expect(txMock.entrenador.update).toHaveBeenCalledWith({
      where: { idUsuario: usuarioId },
      data: { pruebaUtilizada: true },
    });
  });
});