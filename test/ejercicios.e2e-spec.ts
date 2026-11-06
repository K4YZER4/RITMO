import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';

import {
  auth,
  crearApp,
  registrarYLoguearAlumno,
  registrarYLoguearEntrenador,
} from './utils/app-builder';
import { limpiarDatos } from './utils/db';
import { ejercicioPayload } from './utils/fixtures';

/**
 * Ejercicios personalizados: creación, actualización y desactivación.
 * Los músculos/equipos id=1 provienen de los catálogos sembrados por las migraciones.
 */
describe('Ejercicios personalizados (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('un alumno crea un ejercicio personalizado', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(token))
      .send(ejercicioPayload())
      .expect(201);

    expect(respuesta.body.success).toBe(true);
    expect(respuesta.body.data.id).toMatch(/^\d+$/);
  });

  it('un entrenador también puede crear un ejercicio', async () => {
    const { token } = await registrarYLoguearEntrenador(app);

    await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(token))
      .send(ejercicioPayload())
      .expect(201);
  });

  it('el creador puede actualizar su ejercicio', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const creado = await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(token))
      .send(ejercicioPayload())
      .expect(201);

    const id = creado.body.data.id as string;

    const respuesta = await request(app.getHttpServer())
      .patch(`/ejerciciosPersonalizados/${id}`)
      .set(auth(token))
      .send(ejercicioPayload({ nombre: `Sentadilla e2e ${Date.now()}` }))
      .expect(200);

    expect(respuesta.body.success).toBe(true);
  });

  it('un usuario distinto no puede modificar un ejercicio ajeno (403)', async () => {
    const { token: tokenCreador } = await registrarYLoguearAlumno(app);

    const creado = await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(tokenCreador))
      .send(ejercicioPayload())
      .expect(201);

    const id = creado.body.data.id as string;

    const { token: tokenOtro } = await registrarYLoguearAlumno(app);

    await request(app.getHttpServer())
      .patch(`/ejerciciosPersonalizados/${id}`)
      .set(auth(tokenOtro))
      .send(ejercicioPayload())
      .expect(403);
  });

  it('el creador puede desactivar (soft-delete) su ejercicio', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const creado = await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(token))
      .send(ejercicioPayload())
      .expect(201);

    const id = creado.body.data.id as string;

    const respuesta = await request(app.getHttpServer())
      .delete(`/ejerciciosPersonalizados/${id}`)
      .set(auth(token))
      .expect(200);

    expect(respuesta.body.message).toBe('Ejercicio personalizado desactivado exitosamente');
  });

  it('rechaza crear un ejercicio con músculos vacíos (400)', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .set(auth(token))
      .send(ejercicioPayload({ musculos: [] }))
      .expect(400);

    expect(respuesta.body.code).toBeDefined();
  });

  it('rechaza crear un ejercicio sin autenticación (401)', async () => {
    await request(app.getHttpServer())
      .post('/ejerciciosPersonalizados')
      .send(ejercicioPayload())
      .expect(401);
  });
});
