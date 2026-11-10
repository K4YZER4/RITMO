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
import {
  cancelarAlumnoPayload,
  cancelarMiEntrenadorPayload,
  consumirTokenPayload,
} from './utils/fixtures';

/**
 * Vínculo alumno-entrenador: generación y consumo de token, y cancelaciones.
 */
describe('Alumno-Entrenador (e2e)', () => {
  let app: INestApplication<App>;
  let entrenadorToken: string;
  let entrenadorPassword: string;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);

    const entrenador = await registrarYLoguearEntrenador(app);
    entrenadorToken = entrenador.token;
    entrenadorPassword = entrenador.payload.password;
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  async function vincularNuevaAlumna() {
    const alumna = await registrarYLoguearAlumno(app);

    const tokenRespuesta = await request(app.getHttpServer())
      .post('/alumno-entrenador/token')
      .set(auth(alumna.token))
      .expect(201);

    const { codigo, secreto } = tokenRespuesta.body.data;

    const consumoRespuesta = await request(app.getHttpServer())
      .post('/alumno-entrenador/token/consumir')
      .set(auth(entrenadorToken))
      .send(consumirTokenPayload(codigo, secreto))
      .expect(201);

    return { alumna, consumoRespuesta };
  }

  it('un alumno genera su token de vinculación', async () => {
    const { token } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post('/alumno-entrenador/token')
      .set(auth(token))
      .expect(201);

    expect(respuesta.body.data.codigo).toBeDefined();
    expect(respuesta.body.data.secreto).toBeDefined();
    expect(respuesta.body.data.expira_en).toBeDefined();
  });

  it('un entrenador consume el token y se vincula al alumno', async () => {
    const { consumoRespuesta } = await vincularNuevaAlumna();

    expect(consumoRespuesta.body.success).toBe(true);
    expect(consumoRespuesta.body.data.correo).toMatch(/@test\.com$/);
  });

  it('el alumno puede cancelar a su entrenador confirmando su contraseña', async () => {
    const { alumna } = await vincularNuevaAlumna();

    const respuesta = await request(app.getHttpServer())
      .put('/alumno-entrenador/cancelar/mi-entrenador')
      .set(auth(alumna.token))
      .send(cancelarMiEntrenadorPayload())
      .expect(200);

    expect(respuesta.body.success).toBe(true);
  });

  it('el entrenador puede cancelar a un alumno asignado confirmando su contraseña', async () => {
    const { alumna, consumoRespuesta } = await vincularNuevaAlumna();
    const idAlumno = consumoRespuesta.body.data.id_alumno as string;

    const respuesta = await request(app.getHttpServer())
      .put(`/alumno-entrenador/cancelar/alumno/${idAlumno}`)
      .set(auth(entrenadorToken))
      .send(cancelarAlumnoPayload())
      .expect(200);

    expect(respuesta.body.success).toBe(true);
    expect(alumna.token).toBeDefined();
  });

  it('rechaza consumir un token inválido sin cerrar la sesión (400)', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/alumno-entrenador/token/consumir')
      .set(auth(entrenadorToken))
      .send(consumirTokenPayload('CODIGO-INEXISTENTE', 'secreto-invalido'))
      .expect(400);

    expect(respuesta.body.code).toBe('HTTP_EXCEPTION');

    await request(app.getHttpServer()).get('/perfil').set(auth(entrenadorToken)).expect(200);
  });
});
