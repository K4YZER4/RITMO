import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoPagoEnum, Prisma, ProveedorPagoEnum } from '@prisma/client';
import type Stripe from 'stripe';

import { ProcesarFacturaHandler } from './procesar-factura.handler';
import { PrismaService } from '../../../prisma/prisma.service';
import { SuscripcionesService } from '../../suscripciones/suscripciones.service';
import { StripeService } from '../../stripe/stripe.service';

const stripeSubscriptionId = 'sub_1';

const crearEventoFactura = (pagoState: {
  montoCentavos: number;
  cancelAtPeriodEnd?: boolean;
}): Stripe.Event => ({
  id: 'evt_factura_1',
  type: 'invoice.paid',
  data: {
    object: {
      id: 'in_1',
      currency: 'mxn',
      amount_paid: pagoState.montoCentavos,
      amount_due: pagoState.montoCentavos,
      parent: {
        subscription_details: {
          subscription: stripeSubscriptionId,
        },
      },
    },
  },
} as unknown as Stripe.Event);

describe('ProcesarFacturaHandler', () => {
  let handler: ProcesarFacturaHandler;

  const prismaMock = {
    pago: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    suscripcion: {
      findFirst: jest.fn(),
    },
    eventoStripe: {
      update: jest.fn(),
    },
  };

  const suscripcionesServiceMock = {
    activarSuscripcionPorPagoConfirmado: jest.fn(),
    marcarSuscripcionComoMorosaPorPagoFallido: jest.fn(),
  };

  const stripeServiceMock = {
    obtenerSuscripcion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcesarFacturaHandler,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SuscripcionesService, useValue: suscripcionesServiceMock },
        { provide: StripeService, useValue: stripeServiceMock },
      ],
    }).compile();

    handler = module.get<ProcesarFacturaHandler>(ProcesarFacturaHandler);
  });

  describe('procesarFacturaPagada', () => {
    it('debe activar la suscripción con el periodo de la suscripción Stripe', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst.mockResolvedValue(null);
      prismaMock.pago.create.mockResolvedValue({ id: BigInt(1), suscripcionId: BigInt(10) });
      stripeServiceMock.obtenerSuscripcion.mockResolvedValue({
        cancel_at_period_end: false,
        items: {
          data: [
            {
              current_period_start: 1725148800,
              current_period_end: 1727827200,
            },
          ],
        },
      });

      const evento = crearEventoFactura({ montoCentavos: 19900 });

      const result = await handler.procesarFacturaPagada(evento);

      expect(suscripcionesServiceMock.activarSuscripcionPorPagoConfirmado).toHaveBeenCalledWith(
        BigInt(1),
        new Date(1725148800 * 1000),
        new Date(1727827200 * 1000),
        new Date(1727827200 * 1000),
      );

      expect(prismaMock.eventoStripe.update).toHaveBeenCalledWith({
        where: { stripeEventId: evento.id },
        data: { pagoId: BigInt(1), suscripcionId: BigInt(10) },
      });
      expect(result).toEqual({
        recibido: true,
        tipo: 'invoice.paid',
        pagoId: '1',
        suscripcionId: '10',
      });
    });

    it('debe reutilizar el pago existente con el mismo proveedorFacturaId', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst.mockResolvedValueOnce({
        id: BigInt(5),
        proveedor: ProveedorPagoEnum.stripe,
        proveedorFacturaId: 'in_1',
      });
      stripeServiceMock.obtenerSuscripcion.mockResolvedValue({
        cancel_at_period_end: true,
        items: {
          data: [
            {
              current_period_start: 1725148800,
              current_period_end: 1727827200,
            },
          ],
        },
      });

      await handler.procesarFacturaPagada(crearEventoFactura({ montoCentavos: 19900 }));

      expect(suscripcionesServiceMock.activarSuscripcionPorPagoConfirmado).toHaveBeenCalledWith(
        BigInt(5),
        expect.any(Date),
        expect.any(Date),
        null,
      );
      expect(prismaMock.pago.create).not.toHaveBeenCalled();
    });

    it('debe fusionar el pago pendiente inicial con la factura', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: BigInt(7) });
      prismaMock.pago.update.mockResolvedValue({ id: BigInt(7), suscripcionId: BigInt(10) });
      stripeServiceMock.obtenerSuscripcion.mockResolvedValue({
        cancel_at_period_end: false,
        items: {
          data: [
            {
              current_period_start: 1725148800,
              current_period_end: 1727827200,
            },
          ],
        },
      });

      await handler.procesarFacturaPagada(crearEventoFactura({ montoCentavos: 19900 }));

      expect(prismaMock.pago.update).toHaveBeenCalledWith({
        where: { id: BigInt(7) },
        data: {
          monto: new Prisma.Decimal(199),
          moneda: 'MXN',
          proveedorFacturaId: 'in_1',
        },
      });
      expect(prismaMock.pago.create).not.toHaveBeenCalled();
    });

    it('debe crear un pago nuevo si no hay pago previo asociado', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst.mockResolvedValue(null);
      prismaMock.pago.create.mockResolvedValue({ id: BigInt(8), suscripcionId: BigInt(10) });
      stripeServiceMock.obtenerSuscripcion.mockResolvedValue({
        cancel_at_period_end: false,
        items: {
          data: [
            {
              current_period_start: 1725148800,
              current_period_end: 1727827200,
            },
          ],
        },
      });

      await handler.procesarFacturaPagada(crearEventoFactura({ montoCentavos: 19900 }));

      expect(prismaMock.pago.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            suscripcionId: BigInt(10),
            monto: new Prisma.Decimal(199),
            proveedor: ProveedorPagoEnum.stripe,
            proveedorFacturaId: 'in_1',
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException si la factura no tiene suscripción asociada', async () => {
      const eventoSinSub = {
        ...crearEventoFactura({ montoCentavos: 100 }),
        data: { object: { id: 'in_2', parent: {} } },
      } as unknown as Stripe.Event;

      await expect(handler.procesarFacturaPagada(eventoSinSub)).rejects.toThrow(
        new BadRequestException('La factura Stripe no tiene una suscripción asociada'),
      );
    });

    it('debe lanzar NotFoundException si no existe la suscripción local', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue(null);

      await expect(handler.procesarFacturaPagada(crearEventoFactura({ montoCentavos: 100 }))).rejects.toThrow(
        new NotFoundException('No se encontró la suscripción local de Stripe'),
      );
    });
  });

  describe('procesarFacturaFallida', () => {
    it('debe marcar la suscripción como morosa', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst.mockResolvedValue({
        id: BigInt(9),
        proveedor: ProveedorPagoEnum.stripe,
        proveedorFacturaId: 'in_1',
      });

      await handler.procesarFacturaFallida(crearEventoFactura({ montoCentavos: 19900 }));

      expect(
        suscripcionesServiceMock.marcarSuscripcionComoMorosaPorPagoFallido,
      ).toHaveBeenCalledWith(BigInt(9));
      expect(prismaMock.eventoStripe.update).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_factura_1' },
        data: { pagoId: BigInt(9), suscripcionId: BigInt(10) },
      });
    });

    it('debe lanzar BadRequestException si el monto de la factura es inválido', async () => {
      prismaMock.suscripcion.findFirst.mockResolvedValue({ id: BigInt(10) });
      prismaMock.pago.findFirst.mockResolvedValue(null);

      await expect(
        handler.procesarFacturaFallida(crearEventoFactura({ montoCentavos: 0 })),
      ).rejects.toThrow(new BadRequestException('La factura Stripe contiene un monto inválido'));
    });
  });
});