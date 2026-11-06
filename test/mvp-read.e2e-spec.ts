import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { App } from 'supertest/types';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import {
  auth,
  crearApp,
  registrarYLoguearAlumno,
  registrarYLoguearEntrenador,
} from './utils/app-builder';
import { asegurarEjercicioEstandar, limpiarDatos } from './utils/db';
import { rutinaPayload } from './utils/fixtures';

describe('MVP read API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let entrenadorToken: string;
  let alumnoToken: string;
  let entrenadorId: string;
  let alumnoId: string;

  beforeAll(async () => {
    app = await crearApp();
    prisma = app.get(PrismaService);
    await limpiarDatos(app);

    ({ token: entrenadorToken } = await registrarYLoguearEntrenador(app));
    ({ token: alumnoToken } = await registrarYLoguearAlumno(app));
    entrenadorId = getIdDesdeToken(entrenadorToken);
    alumnoId = getIdDesdeToken(alumnoToken);

    await prisma.alumno.update({
      where: { idUsuario: alumnoId },
      data: { idEntrenadorActual: entrenadorId },
    });
    await prisma.usuario.update({
      where: { id: alumnoId },
      data: { role: UserRole.alumnoConEntrenador },
    });
    await asegurarEjercicioEstandar(prisma);
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('expone catálogos públicos', async () => {
    const respuesta = await request(app.getHttpServer()).get('/catalogos').expect(200);

    expect(respuesta.body.sexos.length).toBeGreaterThan(0);
    expect(respuesta.body.objetivos.length).toBeGreaterThan(0);
    expect(respuesta.body.planesAlumno.length).toBeGreaterThan(0);
    expect(respuesta.body.planesEntrenador.length).toBeGreaterThan(0);
  });

  it('devuelve el perfil autenticado sin exponer la contraseña', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/perfil')
      .set(auth(alumnoToken))
      .expect(200);

    expect(respuesta.body.id).toBe(alumnoId);
    expect(respuesta.body.role).toBe('alumnoConEntrenador');
    expect(respuesta.body.hashedPassword).toBeUndefined();
    expect(respuesta.body.alumno.entrenadorActual.idUsuario).toBe(entrenadorId);
  });

  it('lista la biblioteca de ejercicios', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/ejercicios')
      .set(auth(entrenadorToken))
      .expect(200);

    expect(respuesta.body.estandar.length).toBeGreaterThan(0);
    expect(respuesta.body.personalizados).toEqual([]);
  });

  it('lista y muestra las rutinas creadas por el entrenador', async () => {
    const payload = rutinaPayload();
    await request(app.getHttpServer())
      .post('/rutinas')
      .set(auth(entrenadorToken))
      .send(payload)
      .expect(201);

    const lista = await request(app.getHttpServer())
      .get('/rutinas')
      .set(auth(entrenadorToken))
      .expect(200);
    const rutina = lista.body.find((item: { nombre: string }) => item.nombre === payload.nombre);

    expect(rutina).toBeDefined();

    const detalle = await request(app.getHttpServer())
      .get(`/rutinas/${rutina.id}`)
      .set(auth(entrenadorToken))
      .expect(200);

    expect(detalle.body.nombre).toBe(payload.nombre);
    expect(detalle.body.rutinaEjercicio).toEqual([]);
  });

  it('permite al entrenador consultar sus alumnos vinculados', async () => {
    const lista = await request(app.getHttpServer())
      .get('/entrenador/alumnos')
      .set(auth(entrenadorToken))
      .expect(200);

    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].idUsuario).toBe(alumnoId);

    const detalle = await request(app.getHttpServer())
      .get(`/entrenador/alumnos/${alumnoId}`)
      .set(auth(entrenadorToken))
      .expect(200);

    expect(detalle.body.idUsuario).toBe(alumnoId);
  });

  it('impide que un alumno consulte el dashboard de entrenador', async () => {
    await request(app.getHttpServer())
      .get('/entrenador/resumen')
      .set(auth(alumnoToken))
      .expect(403);
  });
});

function getIdDesdeToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  return payload.id as string;
}
