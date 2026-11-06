import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';

import {
  auth,
  crearApp,
  iniciarSesion,
  registrarAlumno,
  registrarEntrenador,
  registrarYLoguearAlumno,
} from './utils/app-builder';
import { limpiarDatos } from './utils/db';
import { alumnoPayload, PASSWORD_E2E } from './utils/fixtures';

/**
 * Pruebas del flujo de autenticación (registro, login, logout y validación de token).
 * No requiere configuración adicional: usa la DB de test y el JWT de test/.env.test.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('registra un alumno y devuelve mensaje de éxito', async () => {
    const { respuesta } = await registrarAlumno(app);

    expect(respuesta.body).toEqual({ message: 'Usuario registrado exitosamente' });
  });

  it('registra un entrenador y devuelve mensaje de éxito', async () => {
    const { respuesta } = await registrarEntrenador(app);

    expect(respuesta.body).toEqual({ message: 'Usuario registrado exitosamente' });
  });

  it('no permite registrar dos veces el mismo correo (409)', async () => {
    const { payload } = await registrarAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post('/auth/registrar/alumno')
      .send(payload)
      .expect(409);

    expect(respuesta.body.code).toBe('PRISMA_UNIQUE_CONSTRAINT');
  });

  it('inicia sesión y devuelve un token JWT válido', async () => {
    const { payload } = await registrarAlumno(app);

    const token = await iniciarSesion(app, payload.correo, payload.password);

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('normaliza mayúsculas y espacios en el correo de login', async () => {
    const { payload } = await registrarAlumno(app);

    const token = await iniciarSesion(app, `  ${payload.correo.toUpperCase()}  `, payload.password);

    expect(token.split('.')).toHaveLength(3);
  });

  it('rechaza una fecha de nacimiento futura', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/registrar/alumno')
      .send(alumnoPayload({ fecha_nacimiento: '2999-01-01' }))
      .expect(400);

    expect(respuesta.body.message).toContain('fecha de nacimiento');
  });

  it('el token permite acceder a un endpoint protegido', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .get('/suscripciones/actual')
      .set(auth(token))
      .expect(200);

    expect(respuesta.body.id).toBeDefined();
  });

  it('rechaza un acceso sin token (401)', async () => {
    await request(app.getHttpServer()).get('/suscripciones/actual').expect(401);
  });

  it('rechaza login con contraseña incorrecta (401)', async () => {
    const { payload } = await registrarAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: payload.correo, password: 'incorrecta123' })
      .expect(401);

    expect(respuesta.body.code).toBe('HTTP_EXCEPTION');
    expect(respuesta.body.message).toBe('Correo o contraseña incorrectos');
  });

  it('rechaza login de un correo inexistente (401)', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'noexiste@test.com', password: PASSWORD_E2E })
      .expect(401);

    expect(respuesta.body.message).toBe('Correo o contraseña incorrectos');
  });

  it('hace logout y revoca el token emitido', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    await request(app.getHttpServer()).post('/auth/logout').set(auth(token)).expect(201);

    await request(app.getHttpServer()).get('/suscripciones/actual').set(auth(token)).expect(401);
  });
});
