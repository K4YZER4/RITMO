import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';

export interface EventoStripeFirmado {
  payload: string;
  firma: string;
}

const secretKey = process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!secretKey.startsWith('sk_test_')) {
  throw new Error('[e2e] STRIPE_SECRET_KEY debe ser una clave de test (sk_test_).');
}
if (!webhookSecret.startsWith('whsec_')) {
  throw new Error('[e2e] STRIPE_WEBHOOK_SECRET debe iniciar con whsec_.');
}

const stripe = new Stripe(secretKey);

function idEvento(tipo: string): string {
  return `evt_${tipo}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/**
 * Firma el payload EXACTO que se envía con el request del webhook.
 * Como dotenv carga test/.env.test, los eventos se firman con el mismo
 * STRIPE_WEBHOOK_SECRET que usa la app para verificar.
 */
function firmar(evento: Record<string, unknown>): EventoStripeFirmado {
  const payload = JSON.stringify(evento);
  const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  return { payload, firma };
}

export function firmarEvento(evento: Record<string, unknown>): EventoStripeFirmado {
  return firmar(evento);
}

export function eventoCheckoutCompletado(opciones: {
  sessionId: string;
  pagoId: bigint | string;
  suscripcionId: bigint | string;
  customerId: string;
  subscriptionId: string;
}): EventoStripeFirmado {
  return firmar({
    id: idEvento('cs'),
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: opciones.sessionId,
        object: 'checkout.session',
        metadata: {
          pagoId: String(opciones.pagoId),
          suscripcionId: String(opciones.suscripcionId),
        },
        customer: opciones.customerId,
        subscription: opciones.subscriptionId,
      },
    },
  });
}

export function eventoFacturaPagada(opciones: {
  subscriptionId: string;
  amountPaidCentavos: number;
  currency?: string;
}): EventoStripeFirmado {
  return firmar({
    id: idEvento('invoice'),
    object: 'event',
    type: 'invoice.paid',
    data: {
      object: {
        id: `in_test_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        object: 'invoice',
        amount_paid: opciones.amountPaidCentavos,
        currency: opciones.currency ?? 'mxn',
        // ProcesarFacturaHandler resuelve la suscripción desde invoice.parent.subscription_details.subscription
        parent: {
          subscription_details: {
            subscription: opciones.subscriptionId,
          },
        },
      },
    },
  });
}

export function eventoFacturaFallida(opciones: {
  subscriptionId: string;
  amountDueCentavos: number;
  currency?: string;
}): EventoStripeFirmado {
  return firmar({
    id: idEvento('invoice'),
    object: 'event',
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: `in_test_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        object: 'invoice',
        amount_due: opciones.amountDueCentavos,
        currency: opciones.currency ?? 'mxn',
        parent: {
          subscription_details: {
            subscription: opciones.subscriptionId,
          },
        },
      },
    },
  });
}

export function eventoSuscripcionEliminada(opciones: {
  subscriptionId: string;
}): EventoStripeFirmado {
  return firmar({
    id: idEvento('sub_deleted'),
    object: 'event',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: opciones.subscriptionId,
        object: 'subscription',
      },
    },
  });
}

/**
 * Crea un cliente + suscripción REALES en la cuenta de test de Stripe.
 * Necesario porque invo.paid llama stripeService.obtenerSuscripcion(subId)
 * contra la API real. El primer cobro se paga con la tarjeta de prueba.
 */
export async function crearClienteYSubscripcionStripe(priceId: string): Promise<{
  customerId: string;
  subscriptionId: string;
}> {
  const metodoPago = await stripe.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa' },
  });

  const customer = await stripe.customers.create({});

  await stripe.paymentMethods.attach(metodoPago.id, { customer: customer.id });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    default_payment_method: metodoPago.id,
  });

  return { customerId: customer.id, subscriptionId: subscription.id };
}
