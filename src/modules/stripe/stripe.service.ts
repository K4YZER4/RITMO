import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type CrearCheckoutSuscripcionInput = {
  pagoId: bigint;
  suscripcionId: bigint;
  usuarioId: string;
  proveedorPriceId: string;
  customerId?: string | null;
  trialEnd?: number;
  successUrl: string;
  cancelUrl: string;
};

export type CrearOConsultarCustomerInput = {
  usuarioId: string;
  correo?: string;
  nombre?: string;
  customerId?: string | null;
};

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');

    this.webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    this.stripe = new Stripe(secretKey);
  }

  verificarWebhook(rawBody: Buffer, firma: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(rawBody, firma, this.webhookSecret);
    } catch {
      throw new BadRequestException('Firma de webhook de Stripe inválida');
    }
  }

  async crearOActualizarCustomer(input: CrearOConsultarCustomerInput): Promise<{ id: string }> {
    const payload = {
      email: input.correo,
      name: input.nombre,
      metadata: {
        usuarioId: input.usuarioId,
      },
    };

    if (input.customerId) {
      const customer = await this.stripe.customers.update(input.customerId, payload);

      return { id: customer.id };
    }

    const customer = await this.stripe.customers.create(payload);

    return { id: customer.id };
  }

  async crearCheckoutSuscripcion(
    input: CrearCheckoutSuscripcionInput,
  ): Promise<Stripe.Checkout.Session> {
    const metadata = {
      pagoId: input.pagoId.toString(),
      suscripcionId: input.suscripcionId.toString(),
      usuarioId: input.usuarioId,
    };

    return this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: input.customerId ?? undefined,
        client_reference_id: input.pagoId.toString(),

        line_items: [
          {
            price: input.proveedorPriceId,
            quantity: 1,
          },
        ],

        metadata,

        subscription_data: {
          trial_end: input.trialEnd ?? undefined,
          metadata,
        },

        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      {
        idempotencyKey: `checkout-pago-${input.pagoId.toString()}`,
      },
    );
  }

  async obtenerCheckoutSession(checkoutSessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(checkoutSessionId);
  }

  async obtenerSuscripcion(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  async cancelarInmediatamente(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  async cancelarAlFinalDelPeriodo(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async reanudarSuscripcion(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  }
}
