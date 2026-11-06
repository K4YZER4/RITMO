import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { auth, crearApp, registrarYLoguearAlumno } from './utils/app-builder';
import { limpiarDatos } from './utils/db';
import { cambiarPlanPayload, ID_PLAN_DE_PAGO, ID_PLAN_GRATIS } from './utils/fixtures';

/**
 * Suscripciones: lectura de la suscripción actual, estado de pago y cambio de plan.
 * El plan 1 (Basico) es gratuito/vitalicio y el plan 2 (Intermedio) es de pago.
 * Usa la configuración real del plan 2 (prueba/morosa) según la DB de test.
 */
describe('Suscripciones (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('un alumno nuevo tiene la suscripción del plan gratuito activa', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .get('/suscripciones/actual')
      .set(auth(token))
      .expect(200);

    expect(respuesta.body.estado).toBe('activa');
    expect(respuesta.body.vitalicia).toBe(true);
    expect(respuesta.body.planAlumno.id).toBe(ID_PLAN_GRATIS);
    expect(respuesta.body.planAlumno.nombre).toBe('Basico');
  });

  it('una suscripción vitalicia tiene estado de pago "pagado"', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .get('/suscripciones/estado-pago')
      .set(auth(token))
      .expect(200);

    expect(respuesta.body.estado).toBe('pagado');
  });

  it('cambia del plan gratuito al plan de pago y crea un pago pendiente', async () => {
    const { token } = await registrarYLoguearAlumno(app);
    const prisma = app.get(PrismaService);

    const respuesta = await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(ID_PLAN_DE_PAGO))
      .expect(200);

    expect(respuesta.body.id).toMatch(/^\d+$/);
    expect(['prueba', 'morosa']).toContain(respuesta.body.estado);
    expect(respuesta.body.vitalicia).toBe(false);
    expect(respuesta.body.planAlumnoId).toBe(ID_PLAN_DE_PAGO);

    const pago = await prisma.pago.findFirst({
      where: { suscripcionId: BigInt(respuesta.body.id) },
    });

    expect(pago).not.toBeNull();
    expect(pago!.estado).toBe('pendiente');
  });

  it('tras cambiar a un plan de pago, el estado de pago es "pendiente" cuando corresponde', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const cambio = await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(ID_PLAN_DE_PAGO))
      .expect(200);

    const respuesta = await request(app.getHttpServer())
      .get('/suscripciones/estado-pago')
      .set(auth(token));

    if (cambio.body.estado === 'morosa') {
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.estado).toBe('pendiente');
      expect(respuesta.body.pagoId).toMatch(/^\d+$/);
    } else {
      expect(respuesta.body.estado).toBe('pagado');
    }
  });

  it('rechaza cambiar al plan que ya está asignado (409)', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(ID_PLAN_GRATIS))
      .expect(409);

    expect(respuesta.body.message).toContain('Ya tienes asignado este plan');
  });

  it('devuelve 404 al intentar cambiar a un plan inexistente', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(999_999))
      .expect(404);
  });

  it('vuelve al plan gratuito y recupera una suscripción activa vitalicia', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(ID_PLAN_DE_PAGO))
      .expect(200);

    const cambio = await request(app.getHttpServer())
      .patch('/suscripciones/plan')
      .set(auth(token))
      .send(cambiarPlanPayload(ID_PLAN_GRATIS))
      .expect(200);

    expect(cambio.body.estado).toBe('activa');
    expect(cambio.body.vitalicia).toBe(true);

    const actual = await request(app.getHttpServer())
      .get('/suscripciones/actual')
      .set(auth(token))
      .expect(200);

    expect(actual.body.estado).toBe('activa');
    expect(actual.body.planAlumno.id).toBe(ID_PLAN_GRATIS);
  });

  it('rechaza consultar suscripciones sin token (401)', async () => {
    await request(app.getHttpServer()).get('/suscripciones/actual').expect(401);
  });
});
