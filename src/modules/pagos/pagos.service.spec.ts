import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoPagoEnum, ProveedorPagoEnum } from '@prisma/client';

import { PagosService } from './pagos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { StripeService } from '../stripe/stripe.service';
import { ProcesarCheckoutCompletadoHandler } from './handlers/procesar-chekout-completado.handler';
import { ProcesarFacturaHandler } from './handlers/procesar-factura.handler';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const prismaMock = {
  pago: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  suscripcion: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  eventoStripe: {
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const suscripcionesServiceMock = {
  activarSuscripcionPorPagoConfirmado: jest.fn(),
  marcarSuscripcionComoMorosaPorPagoFallido: jest.fn(),
};

const stripeServiceMock = {
  crearCheckoutSuscripcion: jest.fn(),
  obtenerCheckoutSession: jest.fn(),
  verificarWebhook: jest.fn(),
  obtenerSuscripcion: jest.fn(),
};

const configServiceMock = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'FRONTEND_URL') return 'https://app.com';
    throw new Error(`Missing env ${key}`);
  }),
};

const procesarFacturaHandlerMock = {
  procesarFacturaPagada: jest.fn(),
  procesarFacturaFallida: jest.fn(),
};

const procesarCheckoutCompletadoHandlerMock = {
  ejecutar: jest.fn(),
};

describe('PagosService', () => {
  let service: PagosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SuscripcionesService, useValue: suscripcionesServiceMock },
        { provide: StripeService, useValue: stripeServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: ProcesarFacturaHandler, useValue: procesarFacturaHandlerMock },
        { provide: ProcesarCheckoutCompletadoHandler, useValue: procesarCheckoutCompletadoHandlerMock },
      ],
    }).compile();

    service = module.get<PagosService>(PagosService);
  });

  describe('crearCheckout', () => {
    const pagoBase = {
      id: BigInt(10),
      suscripcionId: BigInt(20),
      estado: EstadoPagoEnum.pendiente,
      proveedor: ProveedorPagoEnum.stripe,
      proveedorPagoId: null,
      suscripcion: {
        id: BigInt(20),
        alumnoId: usuarioId,
        entrenadorId: null,
        proveedorCustomerId: 'cus_1',
        proveedorPrecioIdSnapshot: 'price_1',
      },
    };

    it('debe crear un checkout y guardar la sesión de Stripe', async () => {
      prismaMock.pago.findUnique.mockResolvedValue(pagoBase);
      stripeServiceMock.crearCheckoutSuscripcion.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      });

      const result = await service.crearCheckout(usuarioId, BigInt(10), BigInt(20));

      expect(stripeServiceMock.crearCheckoutSuscripcion).toHaveBeenCalledWith({
        pagoId: BigInt(10),
        suscripcionId: BigInt(20),
        usuarioId,
        proveedorPriceId: 'price_1',
        customerId: 'cus_1',
        successUrl: 'https://app.com/pago/exito?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://app.com/pago/cancelado',
      });
      expect(prismaMock.pago.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { proveedorPagoId: 'cs_test_123' },
      });
      expect(result).toEqual({
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        reutilizada: false,
      });
    });

    it('debe reutilizar un checkout abierto existente', async () => {
      prismaMock.pago.findUnique.mockResolvedValue({
        ...pagoBase,
        proveedorPagoId: 'cs_old',
      });
      stripeServiceMock.obtenerCheckoutSession.mockResolvedValue({
        status: 'open',
        url: 'https://checkout.stripe.com/c/pay/cs_old',
      });

      const result = await service.crearCheckout(usuarioId, BigInt(10), BigInt(20));

      expect(stripeServiceMock.crearCheckoutSuscripcion).not.toHaveBeenCalled();
      expect(result).toEqual({
        url: 'https://checkout.stripe.com/c/pay/cs_old',
        reutilizada: true,
      });
    });

    it('debe lanzar NotFoundException si el pago no existe', async () => {
      prismaMock.pago.findUnique.mockResolvedValue(null);

      await expect(service.crearCheckout(usuarioId, BigInt(10), BigInt(20))).rejects.toThrow(
        new NotFoundException('Pago no encontrado'),
      );
    });

    it('debe lanzar BadRequestException si el pago no pertenece a la suscripción', async () => {
      prismaMock.pago.findUnique.mockResolvedValue({
        ...pagoBase,
        suscripcionId: BigInt(99),
      });

      await expect(service.crearCheckout(usuarioId, BigInt(10), BigInt(20))).rejects.toThrow(
        new BadRequestException('El pago no corresponde a la suscripción'),
      );
    });

    it('debe lanzar ForbiddenException si el pago no pertenece al usuario', async () => {
      prismaMock.pago.findUnique.mockResolvedValue({
        ...pagoBase,
        suscripcion: {
          ...pagoBase.suscripcion,
          alumnoId: 'otro-usuario',
          entrenadorId: null,
        },
      });

      await expect(service.crearCheckout(usuarioId, BigInt(10), BigInt(20))).rejects.toThrow(
        new ForbiddenException('No tienes acceso a este pago'),
      );
    });

    it('debe lanzar BadRequestException si el pago no es de Stripe', async () => {
      prismaMock.pago.findUnique.mockResolvedValue({
        ...pagoBase,
        proveedor: 'mercadopago' as unknown as ProveedorPagoEnum,
      });

      await expect(service.crearCheckout(usuarioId, BigInt(10), BigInt(20))).rejects.toThrow(
        new BadRequestException('El pago no está configurado para Stripe'),
      );
    });
  });

  describe('procesarWebhookStripe', () => {
    it('debe lanzar BadRequestException si falta el body o la firma', async () => {
      await expect(service.procesarWebhookStripe(undefined, undefined)).rejects.toThrow(
        new BadRequestException('Webhook de Stripe incompleto'),
      );
    });

    it('debe propagar el error si el registro del evento falla', async () => {
      const evento = { id: 'evt_1', type: 'invoice.paid' };
      stripeServiceMock.verificarWebhook.mockReturnValue(evento);
      prismaMock.eventoStripe.create.mockRejectedValue(new Error('db down'));

      await expect(service.procesarWebhookStripe(Buffer.from('raw'), 'firma')).rejects.toThrow(
        new Error('db down'),
      );
      expect(prismaMock.eventoStripe.update).not.toHaveBeenCalled();
    });

    it('debe ignorar un tipo de evento desconocido', async () => {
      const evento = { id: 'evt_2', type: 'charge.updated' };
      stripeServiceMock.verificarWebhook.mockReturnValue(evento);
      prismaMock.eventoStripe.create.mockResolvedValue({});
      prismaMock.eventoStripe.update.mockResolvedValue({});

      const result = await service.procesarWebhookStripe(Buffer.from('raw'), 'firma');

      expect(result).toEqual({ recibido: true, ignorado: true, tipo: 'charge.updated' });
      expect(prismaMock.eventoStripe.update).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_2' },
        data: { procesado: true, procesadoEn: expect.any(Date), errorMensaje: null },
      });
    });
  });
});
