import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { StripeService } from './stripe.service';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
  }));
});

describe('StripeService', () => {
  let service: StripeService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_test_falso';
              if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_falso';
              throw new Error(`Missing env ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('debe construirse con las claves de Stripe', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith('STRIPE_SECRET_KEY');
    expect(configService.getOrThrow).toHaveBeenCalledWith('STRIPE_WEBHOOK_SECRET');
  });

  describe('verificarWebhook', () => {
    it('debe devolver el evento si la firma es válida', () => {
      const event = { id: 'evt_123', type: 'checkout.session.completed' };
      const stripe = (service as unknown as { stripe: { webhooks: { constructEvent: jest.Mock } } })
        .stripe;
      stripe.webhooks.constructEvent.mockReturnValue(event);

      const result = service.verificarWebhook(Buffer.from('raw'), 'firma');

      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        Buffer.from('raw'),
        'firma',
        'whsec_falso',
      );
      expect(result).toEqual(event);
    });

    it('debe lanzar BadRequestException si la firma es inválida', () => {
      const stripe = (service as unknown as { stripe: { webhooks: { constructEvent: jest.Mock } } })
        .stripe;
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('bad');
      });

      expect(() => service.verificarWebhook(Buffer.from('raw'), 'firma')).toThrow(
        new BadRequestException('Firma de webhook de Stripe inválida'),
      );
    });
  });

  describe('crearCheckoutSuscripcion', () => {
    it('debe crear la sesión de checkout con la metadata correcta', async () => {
      const session = { id: 'cs_test_123' };
      const stripe = (
        service as unknown as {
          stripe: { checkout: { sessions: { create: jest.Mock } } };
        }
      ).stripe;
      stripe.checkout.sessions.create.mockResolvedValue(session);

      const result = await service.crearCheckoutSuscripcion({
        pagoId: BigInt(10),
        suscripcionId: BigInt(20),
        usuarioId: 'u1',
        proveedorPriceId: 'price_1',
        customerId: 'cus_1',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        {
          mode: 'subscription',
          customer: 'cus_1',
          client_reference_id: '10',
          line_items: [{ price: 'price_1', quantity: 1 }],
          metadata: { pagoId: '10', suscripcionId: '20', usuarioId: 'u1' },
          subscription_data: { metadata: { pagoId: '10', suscripcionId: '20', usuarioId: 'u1' } },
          success_url: 'https://app.com/success',
          cancel_url: 'https://app.com/cancel',
        },
        { idempotencyKey: 'checkout-pago-10' },
      );
      expect(result).toEqual(session);
    });
  });

  describe('cancelarAlFinalDelPeriodo / reanudarSuscripcion', () => {
    it('debe llamar a Stripe para cancelar al final del periodo', async () => {
      const stripe = (
        service as unknown as {
          stripe: { subscriptions: { update: jest.Mock } };
        }
      ).stripe;
      stripe.subscriptions.update.mockResolvedValue({});

      await service.cancelarAlFinalDelPeriodo('sub_1');

      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        cancel_at_period_end: true,
      });
    });

    it('debe llamar a Stripe para reanudar la suscripción', async () => {
      const stripe = (
        service as unknown as {
          stripe: { subscriptions: { update: jest.Mock } };
        }
      ).stripe;
      stripe.subscriptions.update.mockResolvedValue({});

      await service.reanudarSuscripcion('sub_1');

      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        cancel_at_period_end: false,
      });
    });
  });
});
