import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { auth, crearApp, iniciarSesion, registrarAlumno } from './utils/app-builder';
import { limpiarDatos } from './utils/db';
import { checkoutPayload, ID_PLAN_DE_PAGO } from './utils/fixtures';
import {
  crearClienteYSubscripcionStripe,
  eventoCheckoutCompletado,
  eventoFacturaFallida,
  eventoFacturaPagada,
  eventoSuscripcionEliminada,
  firmarEvento,
} from './utils/stripe-events';

function postWebhook(app: INestApplication<App>, payload: string, firma: string) {
  return request(app.getHttpServer())
    .post('/pagos/webhook/stripe')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', firma)
    .send(payload);
}

async function registrarAlumnoPlanPago(app: INestApplication<App>) {
  const { payload, respuesta } = await registrarAlumno(app, { id_plan: ID_PLAN_DE_PAGO });

  const body = respuesta.body as {
    requierePago: boolean;
    pagoId: string;
    suscripcionId: string;
  };

  const token = await iniciarSesion(app, payload.correo, payload.password);

  return { token, payload, ...body };
}

/**
 * Pagos: webhooks de Stripe firmados + flujo real de Checkout/Suscripción.
 * Requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET de test en test/.env.test
 * y que el plan 2 (Intermedio) tenga proveedorPrecioId configurado en Stripe.
 */
describe('Pagos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('rechaza un webhook con firma inválida (400)', async () => {
    const respuesta = await postWebhook(app, '{"id":"evt_invalido"}', 'firma-invalida').expect(400);

    expect(respuesta.body.message).toContain('Firma de webhook de Stripe inválida');
  });

  it('rechaza un webhook válido pero sin metadata interna (400)', async () => {
    const evento = firmarEvento({
      id: `evt_sin_metadata_${Date.now()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_sin_metadata', object: 'checkout.session' } },
    });

    const respuesta = await postWebhook(app, evento.payload, evento.firma).expect(400);

    expect(respuesta.body.message).toContain('metadata interna');
  });

  it('crea una sesión de Checkout real para un pago pendiente', async () => {
    const { token, pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);

    const respuesta = await request(app.getHttpServer())
      .post('/pagos/checkout')
      .set(auth(token))
      .send(checkoutPayload(pagoId, suscripcionId))
      .expect(201);

    expect(respuesta.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    expect(respuesta.body.reutilizada).toBe(false);

    const prisma = app.get(PrismaService);
    const pago = await prisma.pago.findUniqueOrThrow({
      where: { id: BigInt(pagoId) },
    });
    expect(pago.proveedorPagoId).toMatch(/^cs_test_/);
  });

  it('una sesión de Checkout abierta se reutiliza', async () => {
    const { token, pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);

    await request(app.getHttpServer())
      .post('/pagos/checkout')
      .set(auth(token))
      .send(checkoutPayload(pagoId, suscripcionId))
      .expect(201);

    const respuesta = await request(app.getHttpServer())
      .post('/pagos/checkout')
      .set(auth(token))
      .send(checkoutPayload(pagoId, suscripcionId))
      .expect(201);

    expect(respuesta.body.reutilizada).toBe(true);
  });

  it('flujo completo: checkout.session.completed + invoice.paid activan la suscripción', async () => {
    const { token, pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);
    const prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/pagos/checkout')
      .set(auth(token))
      .send(checkoutPayload(pagoId, suscripcionId))
      .expect(201);

    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: BigInt(pagoId) } });
    const sessionId = pago.proveedorPagoId!;

    const plan = await prisma.planAlumno.findUniqueOrThrow({ where: { id: ID_PLAN_DE_PAGO } });

    if (!plan.proveedorPrecioId) {
      throw new Error('[e2e] El plan de pago no tiene proveedorPrecioId configurado en Stripe.');
    }

    const { customerId, subscriptionId } = await crearClienteYSubscripcionStripe(
      plan.proveedorPrecioId,
    );

    const evento1 = eventoCheckoutCompletado({
      sessionId,
      pagoId,
      suscripcionId,
      customerId,
      subscriptionId,
    });

    const respuesta1 = await postWebhook(app, evento1.payload, evento1.firma).expect(201);

    expect(respuesta1.body).toMatchObject({
      recibido: true,
      tipo: 'checkout.session.completed',
    });

    const eventoPago = eventoFacturaPagada({
      subscriptionId,
      amountPaidCentavos: Math.round(Number(plan.precio) * 100),
    });

    const respuestaPago = await postWebhook(app, eventoPago.payload, eventoPago.firma).expect(201);

    expect(respuestaPago.body).toMatchObject({
      recibido: true,
      tipo: 'invoice.paid',
    });

    const suscripcion = await prisma.suscripcion.findUniqueOrThrow({
      where: { id: BigInt(suscripcionId) },
    });

    expect(suscripcion.estado).toBe('activa');
    expect(suscripcion.proveedorSubscriptionId).toBe(subscriptionId);
    expect(suscripcion.periodoActualFin).not.toBeNull();
    expect(suscripcion.vitalicia).toBe(false);

    const pagoActualizado = await prisma.pago.findUniqueOrThrow({
      where: { id: BigInt(pagoId) },
    });

    expect(pagoActualizado.estado).toBe('pagado');
    expect(pagoActualizado.proveedorFacturaId).not.toBeNull();
  });

  it('re-enviar el mismo webhook se reporta como duplicado', async () => {
    const { pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);
    const prisma = app.get(PrismaService);

    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: BigInt(pagoId) } });

    const evento = eventoCheckoutCompletado({
      sessionId: `cs_test_${Date.now()}`,
      pagoId,
      suscripcionId,
      customerId: 'cus_e2e_dup',
      subscriptionId: 'sub_e2e_dup',
    });

    expect(pago.estado).toBe('pendiente');

    await postWebhook(app, evento.payload, evento.firma).expect(201);

    const duplicado = await postWebhook(app, evento.payload, evento.firma).expect(201);

    expect(duplicado.body).toMatchObject({ recibido: true, duplicado: true });
  });

  it('invoice.payment_failed marca la suscripción como morosa', async () => {
    const { pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);
    const prisma = app.get(PrismaService);
    const subscriptionId = `sub_test_fallida_${Date.now()}`;

    const checkoutEvento = eventoCheckoutCompletado({
      sessionId: `cs_test_fallida_${Date.now()}`,
      pagoId,
      suscripcionId,
      customerId: 'cus_test_fallida',
      subscriptionId,
    });

    await postWebhook(app, checkoutEvento.payload, checkoutEvento.firma).expect(201);

    const facturaEvento = eventoFacturaFallida({
      subscriptionId,
      amountDueCentavos: 19900,
    });

    const respuesta = await postWebhook(app, facturaEvento.payload, facturaEvento.firma).expect(
      201,
    );

    expect(respuesta.body).toMatchObject({ recibido: true, tipo: 'invoice.payment_failed' });

    const suscripcion = await prisma.suscripcion.findUniqueOrThrow({
      where: { id: BigInt(suscripcionId) },
    });

    expect(suscripcion.estado).toBe('morosa');
  });

  it('customer.subscription.deleted cancela la suscripción local', async () => {
    const { pagoId, suscripcionId } = await registrarAlumnoPlanPago(app);
    const prisma = app.get(PrismaService);
    const subscriptionId = `sub_test_eliminada_${Date.now()}`;

    const checkoutEvento = eventoCheckoutCompletado({
      sessionId: `cs_test_eliminada_${Date.now()}`,
      pagoId,
      suscripcionId,
      customerId: 'cus_test_eliminada',
      subscriptionId,
    });

    await postWebhook(app, checkoutEvento.payload, checkoutEvento.firma).expect(201);

    const eliminadoEvento = eventoSuscripcionEliminada({ subscriptionId });

    const respuesta = await postWebhook(app, eliminadoEvento.payload, eliminadoEvento.firma).expect(
      201,
    );

    expect(respuesta.body).toMatchObject({
      recibido: true,
      tipo: 'customer.subscription.deleted',
    });

    const suscripcion = await prisma.suscripcion.findUniqueOrThrow({
      where: { id: BigInt(suscripcionId) },
    });

    expect(suscripcion.estado).toBe('cancelada');
  });

  it('rechaza crear checkout sin autenticación (401)', async () => {
    await request(app.getHttpServer())
      .post('/pagos/checkout')
      .send(checkoutPayload('1', '1'))
      .expect(401);
  });
});
