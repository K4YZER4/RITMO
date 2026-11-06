import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../src/prisma/prisma.service';

export function emailUnico(prefijo = 'e2e'): string {
  return `${prefijo}_${randomUUID().replace(/-/g, '')}@test.com`;
}

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Vacía las tablas transaccionales creadas por los tests.
 * Con CASCADE también limpia las dependientes (alumno/entrenador, rutinas, tokens, etc.).
 * Respeta los catálogos sembrados por las migraciones (planes, sexo, objetivo, etc.).
 */
/**
 * core.ejercicio_estandar no viene en el seed. Crea uno idempotente
 * (la tabla no se trunca) y devuelve su id, para el PATCH de ejercicios estándar.
 */
export async function asegurarEjercicioEstandar(prisma: PrismaService): Promise<number> {
  const existente = await prisma.ejercicioEstandar.findFirst();
  if (existente) {
    return Number(existente.id);
  }
  const creado = await prisma.ejercicioEstandar.create({
    data: { nombre: `Estandar e2e ${randomUUID().replace(/-/g, '')}` },
  });
  return Number(creado.id);
}

export async function limpiarDatos(app: INestApplication): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('[e2e] Guard: NODE_ENV debe ser "test" antes de limpiar la base de datos.');
  }

  if (process.env.E2E_ALLOW_DATABASE_RESET !== 'true') {
    throw new Error(
      '[e2e] Guard: E2E_ALLOW_DATABASE_RESET debe ser "true" antes de limpiar la base de datos.',
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('[e2e] Guard: DATABASE_URL no está configurada.');
  }

  const prisma = app.get(PrismaService);

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      app_user.usuario,
      app_user.evento_stripe,
      app_user.pago,
      app_user.suscripcion,
      app_user.token_revocado
    CASCADE;
  `);
}
