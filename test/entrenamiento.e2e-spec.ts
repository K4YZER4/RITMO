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

describe('Entrenamiento y progreso (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let alumnoToken: string;
  let alumnoId: string;
  let asignacionId: bigint;

  beforeAll(async () => {
    app = await crearApp();
    prisma = app.get(PrismaService);
    await limpiarDatos(app);

    const entrenador = await registrarYLoguearEntrenador(app);
    const alumno = await registrarYLoguearAlumno(app);
    const entrenadorId = getIdDesdeToken(entrenador.token);
    alumnoToken = alumno.token;
    alumnoId = getIdDesdeToken(alumnoToken);

    await prisma.alumno.update({
      where: { idUsuario: alumnoId },
      data: { idEntrenadorActual: entrenadorId },
    });
    await prisma.usuario.update({
      where: { id: alumnoId },
      data: { role: UserRole.alumnoConEntrenador },
    });

    const ejercicioId = BigInt(await asegurarEjercicioEstandar(prisma));
    const rutina = await prisma.rutina.create({
      data: {
        createdByUsuario: entrenadorId,
        nombre: `Rutina E2E ${Date.now()}`,
        rutinaEjercicio: {
          create: {
            idEjercicioEstandar: ejercicioId,
            orden: 1,
            series: 3,
            repeticiones: 8,
            pesoObjetivo: 80,
          },
        },
      },
    });

    const hoy = new Date();
    const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
    const diaSemana = hoy.getUTCDay() === 0 ? 7 : hoy.getUTCDay();
    const asignacion = await prisma.usuarioRutina.create({
      data: {
        idUsuario: alumnoId,
        idRutina: rutina.id,
        idDiaSemana: diaSemana,
        fechaInicio: fecha,
        asignadaPorUsuario: entrenadorId,
      },
    });
    asignacionId = asignacion.id;
  });

  afterAll(async () => {
    await limpiarDatos(app);
    await app.close();
  });

  it('muestra el entrenamiento asignado para hoy', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/entrenamientos/hoy')
      .set(auth(alumnoToken))
      .expect(200);

    expect(respuesta.body).toHaveLength(1);
    expect(respuesta.body[0].id).toBe(asignacionId.toString());
    expect(respuesta.body[0].rutina.rutinaEjercicio).toHaveLength(1);
  });

  it('inicia, registra y finaliza una sesión completa', async () => {
    const inicio = await request(app.getHttpServer())
      .post('/sesiones')
      .set(auth(alumnoToken))
      .send({ usuario_rutina_id: asignacionId.toString() })
      .expect(201);

    expect(inicio.body.sesionEjercicio).toHaveLength(1);
    expect(inicio.body.sesionEjercicio[0].sesionEjercicioSet).toHaveLength(3);

    const sesionId = inicio.body.id as string;
    const setId = inicio.body.sesionEjercicio[0].sesionEjercicioSet[0].id as string;
    const set = await request(app.getHttpServer())
      .patch(`/sesiones/${sesionId}/sets/${setId}`)
      .set(auth(alumnoToken))
      .send({ repeticiones: 8, peso: 100, rpe: 8, completado: true })
      .expect(200);

    expect(set.body.set.completado).toBe(true);
    expect(set.body.nuevoPr).toBe(true);

    const finalizada = await request(app.getHttpServer())
      .post(`/sesiones/${sesionId}/finalizar`)
      .set(auth(alumnoToken))
      .send({ duracion_minutos: 45, notas: 'Buena sesión' })
      .expect(201);

    expect(finalizada.body.setsCompletados).toBe(1);
    expect(finalizada.body.sesion.idEstado).toBe(2);
  });

  it('registra mediciones y devuelve el resumen de progreso', async () => {
    const fecha = new Date().toISOString().slice(0, 10);
    await request(app.getHttpServer())
      .post('/mediciones')
      .set(auth(alumnoToken))
      .send({ fecha_medicion: fecha, peso_kg: 75.5, grasa_corporal_pct: 18 })
      .expect(201);

    const mediciones = await request(app.getHttpServer())
      .get('/mediciones')
      .set(auth(alumnoToken))
      .expect(200);
    expect(mediciones.body).toHaveLength(1);

    const progreso = await request(app.getHttpServer())
      .get('/progreso/resumen')
      .set(auth(alumnoToken))
      .expect(200);

    expect(progreso.body.sesionesUltimos30Dias).toBe(1);
    expect(progreso.body.volumenUltimos30Dias).toBe(800);
    expect(progreso.body.prs).toHaveLength(1);
    expect(progreso.body.ultimaMedicion.pesoKg).toBe('75.5');
  });
});

function getIdDesdeToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  return payload.id as string;
}
