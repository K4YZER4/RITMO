import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { App } from 'supertest/types';
import type http from 'node:http';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { AppValidationPipe } from '../../src/common/pipes/app-validation.pipe';
import { GlobalExceptionFilter } from '../../src/common/filter/app-global.filter';
import { PASSWORD_E2E, alumnoPayload, entrenadorPayload, loginPayload } from './fixtures';

/**
 * Bootea la app igual que main.ts (pipes, filtro global y rawBody para webhooks)
 * y neutraliza el throttling sin tocar código de producción.
 */
export async function crearApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ThrottlerStorage)
    .useValue({
      increment: () =>
        Promise.resolve({ totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }),
    })
    .compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  app.useGlobalPipes(new AppValidationPipe() as ValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useBodyParser('json', {
    verify: (req: http.IncomingMessage, _res: unknown, buf: Buffer) => {
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  });

  await app.init();

  return app as unknown as INestApplication<App>;
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function registrarAlumno(
  app: INestApplication<App>,
  sobre: Record<string, unknown> = {},
) {
  const payload = alumnoPayload(sobre);
  const respuesta = await request(app.getHttpServer())
    .post('/auth/registrar/alumno')
    .send(payload)
    .expect(201);
  return { payload, respuesta };
}

export async function registrarEntrenador(
  app: INestApplication<App>,
  sobre: Record<string, unknown> = {},
) {
  const payload = entrenadorPayload(sobre);
  const respuesta = await request(app.getHttpServer())
    .post('/auth/registrar/entrenador')
    .send(payload)
    .expect(201);
  return { payload, respuesta };
}

export async function iniciarSesion(
  app: INestApplication<App>,
  correo: string,
  password = PASSWORD_E2E,
): Promise<string> {
  const respuesta = await request(app.getHttpServer())
    .post('/auth/login')
    .send(loginPayload(correo, password))
    .expect(201);

  const token = respuesta.body.token as string | undefined;

  if (!token) {
    throw new Error('[e2e] La respuesta de /auth/login no incluye un token.');
  }

  return token;
}

export async function registrarYLoguearAlumno(
  app: INestApplication<App>,
  sobre: Record<string, unknown> = {},
) {
  const { payload } = await registrarAlumno(app, sobre);
  const token = await iniciarSesion(app, payload.correo, payload.password);
  return { token, payload };
}

export async function registrarYLoguearEntrenador(
  app: INestApplication<App>,
  sobre: Record<string, unknown> = {},
) {
  const { payload } = await registrarEntrenador(app, sobre);
  const token = await iniciarSesion(app, payload.correo, payload.password);
  return { token, payload };
}
