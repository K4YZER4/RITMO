import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProveedorPagoEnum } from '@prisma/client';
import type Stripe from 'stripe';

import { ProcesarCheckoutCompletadoHandler } from './procesar-chekout-completado.handler';
import { PrismaService } from '../../../prisma/prisma.service';

const pagoId = '101';
const suscripcionId = '202';

describe('ProcesarCheckoutCompletadoHandler', () => {
  let handler: ProcesarCheckoutCompletadoHandler;
  let prismaMock: { $transaction: jest.Mock };

  const txMock = {
    pago: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    suscripcion: {
      update: jest.fn(),
    },
    alumno: {
      update: jest.fn(),
    },
    entrenador: {
      update: jest.fn(),
    },
    eventoStripe: {
      update: jest.fn(),
    },
  };

  const pagoBase = {
    id: BigInt(pagoId),
    suscripcionId: BigInt(suscripcionId),
    proveedorPagoId: null,
    suscripcion: {
      alumnoId: 'a12e4567-e89b-12d3-a456-426614174000',
      entrenadorId: null,
    },
  };

  const eventoDelAlumno = {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer: 'cus_1',
        subscription: 'sub_1',
        metadata: {
          pagoId,
          suscripcionId,
          usuarioId: 'usuario-1',
        },
      },
    },
  } as unknown as Stripe.Event;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      $transaction: jest.fn((cb: unknown) => cb(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcesarCheckoutCompletadoHandler,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    handler = module.get<ProcesarCheckoutCompletadoHandler>(ProcesarCheckoutCompletadoHandler);
  });

  it('debe asociar la sesión a la suscripción del alumno', async () => {
    txMock.pago.findUnique.mockResolvedValue(pagoBase);

    const result = await handler.ejecutar(eventoDelAlumno);

    expect(txMock.pago.update).toHaveBeenCalledWith({
      where: { id: BigInt(pagoId) },
      data: {
        proveedor: ProveedorPagoEnum.stripe,
        proveedorPagoId: 'cs_test_123',
      },
    });

    expect(txMock.suscripcion.update).toHaveBeenCalledWith({
      where: { id: BigInt(suscripcionId) },
      data: {
        proveedor: ProveedorPagoEnum.stripe,
        proveedorCustomerId: 'cus_1',
        proveedorSubscriptionId: 'sub_1',
      },
    });

    expect(txMock.alumno.update).toHaveBeenCalledWith({
      where: { idUsuario: pagoBase.suscripcion.alumnoId },
      data: { proveedorCustomerId: 'cus_1' },
    });

    expect(txMock.entrenador.update).not.toHaveBeenCalled();

    expect(result).toEqual({
      recibido: true,
      tipo: eventoDelAlumno.type,
      pagoId,
      suscripcionId,
    });
  });

  it('debe asociar la sesión a la suscripción del entrenador', async () => {
    txMock.pago.findUnique.mockResolvedValue({
      ...pagoBase,
      suscripcion: {
        alumnoId: null,
        entrenadorId: 'a12e4567-e89b-12d3-a456-426614174000',
      },
    });

    await handler.ejecutar(eventoDelAlumno);

    expect(txMock.entrenador.update).toHaveBeenCalledWith({
      where: { idUsuario: 'a12e4567-e89b-12d3-a456-426614174000' },
      data: { proveedorCustomerId: 'cus_1' },
    });

    expect(txMock.alumno.update).not.toHaveBeenCalled();
  });

  it('debe lanzar BadRequestException si falta customer o subscription', async () => {
    const eventoSinSubscripcion = {
      ...eventoDelAlumno,
      data: {
        object: {
          ...eventoDelAlumno.data.object,
          subscription: null,
        },
      },
    } as unknown as Stripe.Event;

    await expect(handler.ejecutar(eventoSinSubscripcion)).rejects.toThrow(
      new BadRequestException('La sesión Stripe no contiene customer o subscription'),
    );
  });

  it('debe lanzar BadRequestException si falta la metadata de pago', async () => {
    const eventoSinMetadata = {
      ...eventoDelAlumno,
      data: {
        object: {
          ...eventoDelAlumno.data.object,
          metadata: {},
        },
      },
    } as unknown as Stripe.Event;

    await expect(handler.ejecutar(eventoSinMetadata)).rejects.toThrow(
      new BadRequestException('La sesión Stripe no contiene metadata interna'),
    );
  });

  it('debe lanzar NotFoundException si el pago no existe', async () => {
    txMock.pago.findUnique.mockResolvedValue(null);

    await expect(handler.ejecutar(eventoDelAlumno)).rejects.toThrow(
      new NotFoundException('No se encontró el pago asociado al Checkout'),
    );
  });

  it('debe lanzar BadRequestException si el pago no pertenece a la suscripción', async () => {
    txMock.pago.findUnique.mockResolvedValue({
      ...pagoBase,
      suscripcionId: BigInt(999),
    });

    await expect(handler.ejecutar(eventoDelAlumno)).rejects.toThrow(
      new BadRequestException('El pago no pertenece a la suscripción del Checkout'),
    );
  });

  it('debe lanzar BadRequestException si la sesión no coincide con el pago local', async () => {
    txMock.pago.findUnique.mockResolvedValue({
      ...pagoBase,
      proveedorPagoId: 'cs_otra_sesion',
    });

    await expect(handler.ejecutar(eventoDelAlumno)).rejects.toThrow(
      new BadRequestException('La sesión Stripe no coincide con el pago local'),
    );

    expect(txMock.pago.update).not.toHaveBeenCalled();
    expect(txMock.suscripcion.update).not.toHaveBeenCalled();
  });
});