import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';

import {
  auth,
  crearApp,
  registrarAlumno,
  registrarEntrenador,
  registrarYLoguearAlumno,
  registrarYLoguearEntrenador,
} from './utils/app-builder';
import { asegurarEjercicioEstandar, limpiarDatos } from './utils/db';
import { asignarRutinaPayload, rutinaEjerciciosPayload, rutinaPayload } from './utils/fixtures';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

async function crearRutina(
  app: INestApplication<App>,
  token: string,
  sobre: Record<string, unknown> = {},
) {
  const payload = rutinaPayload(sobre);

  const respuesta = await request(app.getHttpServer())
    .post('/rutinas')
    .set(auth(token))
    .send(payload)
    .expect(201);

  expect(respuesta.body.success).toBe(true);

  const prisma = app.get(PrismaService);
  const rutina = await prisma.rutina.findFirstOrThrow({
    where: { nombre: payload.nombre },
  });

  return { idRutina: rutina.id, respuesta };
}

/**
 * Rutinas: creación, asignación de ejercicios y asignación a un alumno.
 * Requiere entrenador y alumno registrados (plan Basico por defecto).
 */
describe('Rutinas (e2e)', () => {
  let app: INestApplication<App>;
  let entrenadorToken: string;
  let idAlumno: string;
  let idEjercicioEstandar: number;

  beforeAll(async () => {
    app = await crearApp();
    await limpiarDatos(app);

    ({ token: entrenadorToken } = await registrarYLoguearEntrenador(app));

    // La suite crea 6 rutinas con el mismo entrenador; el plan Basico solo
    // permite 3. Subimos el plan directo vía Prisma (solo afecta tests).
    const prisma = app.get(PrismaService);
    const idUsuarioEntrenador = getIdDesdeToken(entrenadorToken);
    await prisma.entrenador.update({
      where: { idUsuario: idUsuarioEntrenador },
      data: { idPlan: 3 }, // Avanzado: 45 rutinas
    });

    // core.ejercicio_estandar no viene en el seed; creamos uno (idempotente,
    // la tabla no se trunca) para el PATCH de ejercicios estándar.
    idEjercicioEstandar = await asegurarEjercicioEstandar(prisma);

    const alumno = await registrarYLoguearAlumno(app);
    idAlumno = alumno.token ? getIdDesdeToken(alumno.token) : '';
    await prisma.alumno.update({
      where: { idUsuario: idAlumno },
      data: { idEntrenadorActual: idUsuarioEntrenador },
    });
    await prisma.usuario.update({
      where: { id: idAlumno },
      data: { role: UserRole.alumnoConEntrenador },
    });
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('el entrenador crea una rutina', async () => {
    const { respuesta } = await crearRutina(app, entrenadorToken);

    expect(respuesta.body).toEqual({
      success: true,
      message: 'Rutina creada exitosamente',
    });
  });

  it('asigna ejercicios estándar a la rutina', async () => {
    const { idRutina } = await crearRutina(app, entrenadorToken);

    const respuesta = await request(app.getHttpServer())
      .patch(`/rutinas/${idRutina}/ejercicios`)
      .set(auth(entrenadorToken))
      .send(rutinaEjerciciosPayload({ idEstandar: idEjercicioEstandar }))
      .expect(200);

    expect(respuesta.body.success).toBe(true);
  });

  it('asigna la rutina al alumno en el día 1', async () => {
    const { idRutina } = await crearRutina(app, entrenadorToken);

    const respuesta = await request(app.getHttpServer())
      .post(`/rutinas/${idRutina}/asignaciones`)
      .set(auth(entrenadorToken))
      .send(asignarRutinaPayload(idAlumno))
      .expect(201);

    expect(respuesta.body.success).toBe(true);
  });

  it('un alumno no puede asignar rutinas (403)', async () => {
    const { idRutina } = await crearRutina(app, entrenadorToken);
    const { token: tokenAlumno } = await registrarYLoguearAlumno(app);

    const respuesta = await request(app.getHttpServer())
      .post(`/rutinas/${idRutina}/asignaciones`)
      .set(auth(tokenAlumno))
      .send(asignarRutinaPayload(idAlumno))
      .expect(403);

    expect(respuesta.body.message).toContain('permiso');
  });

  it('rechaza una asignación a un usuario que no es alumno (403)', async () => {
    const { idRutina } = await crearRutina(app, entrenadorToken);
    const { payload: otroEntrenadorPayload } = await registrarEntrenador(app);
    const prisma = app.get(PrismaService);
    const otroEntrenador = await prisma.usuario.findUniqueOrThrow({
      where: { correo: otroEntrenadorPayload.correo },
    });

    await request(app.getHttpServer())
      .post(`/rutinas/${idRutina}/asignaciones`)
      .set(auth(entrenadorToken))
      .send(asignarRutinaPayload(otroEntrenador.id))
      .expect(403);
  });

  it('rechaza una nueva asignación que se traslapa en el mismo día (400)', async () => {
    const { idRutina } = await crearRutina(app, entrenadorToken);

    await request(app.getHttpServer())
      .post(`/rutinas/${idRutina}/asignaciones`)
      .set(auth(entrenadorToken))
      .send(asignarRutinaPayload(idAlumno, { numero_dia: 2 }))
      .expect(201);

    const respuesta = await request(app.getHttpServer())
      .post(`/rutinas/${idRutina}/asignaciones`)
      .set(auth(entrenadorToken))
      .send(asignarRutinaPayload(idAlumno, { numero_dia: 2 }))
      .expect(400);

    expect(respuesta.body.message).toContain('traslapa');
  });

  it('permite crear una rutina nueva después de archivar otra', async () => {
    const { token } = await registrarYLoguearEntrenador(app);
    const primera = await crearRutina(app, token, { nombre: `Rutina archivada ${Date.now()}` });
    await crearRutina(app, token, { nombre: `Rutina activa 2 ${Date.now()}` });
    await crearRutina(app, token, { nombre: `Rutina activa 3 ${Date.now()}` });

    await request(app.getHttpServer())
      .patch(`/rutinas/${primera.idRutina}/archivar`)
      .set(auth(token))
      .send({})
      .expect(200);

    const cuarta = await crearRutina(app, token, { nombre: `Rutina nueva ${Date.now()}` });
    expect(cuarta.respuesta.body.success).toBe(true);
  });

  it('rechaza crear rutina sin autenticación (401)', async () => {
    await request(app.getHttpServer())
      .post('/rutinas')
      .send(rutinaPayload({ nombre: `Rutina sin token ${Date.now()}` }))
      .expect(401);
  });
});

function getIdDesdeToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  return payload.id as string;
}
