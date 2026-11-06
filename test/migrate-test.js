'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
const dotenv = require('dotenv');

const envTestPath = path.resolve(__dirname, '.env.test');

if (!fs.existsSync(envTestPath)) {
  console.error('[migrate:test] No existe test/.env.test.');
  console.error('[migrate:test] Copia test/.env.test.example a test/.env.test y ajusta los valores.');
  process.exit(1);
}

const { error, parsed } = dotenv.config({ path: envTestPath });

if (error || !parsed) {
  console.error('[migrate:test] No se pudo leer test/.env.test:', error);
  process.exit(1);
}

function hostDesdeUrl(url) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return '(URL inválida)';
  }
}

console.log(`[migrate:test] Apuntando a la base de TEST: ${hostDesdeUrl(parsed.DATABASE_URL)}`);
console.log('[migrate:test] Aplicando migraciones con prisma migrate deploy...');

const resultado = spawnSync('pnpm prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, ...parsed },
  shell: true,
});

if (resultado.status !== 0) {
  console.error('[migrate:test] prisma migrate deploy falló.');
  process.exit(resultado.status ?? 1);
}

console.log('');
console.log('[migrate:test] Migraciones aplicadas. Verificando planes de alumno...');

(async () => {
  const client = new Client({ connectionString: parsed.DATABASE_URL });
  try {
    await client.connect();
  } catch (e) {
    console.error(
      '[migrate:test] No se pudo conectar a la base de test para verificar los planes.',
    );
    console.error(e);
    process.exit(1);
  }

  try {
    const planes = await client.query(
      'SELECT id, nombre, proveedor_precio_id, periodo_prueba, unidad_periodo_prueba FROM app_user.plan_alumno ORDER BY id;',
    );

    if (planes.rows.length > 0) {
      console.table(planes.rows);
    } else {
      console.warn('[migrate:test] No se encontraron planes de alumno en la base de test.');
    }

    const planPago = planes.rows.find((plan) => plan.id === 2);

    if (planPago && !planPago.proveedor_precio_id) {
      console.warn('');
      console.warn('[migrate:test] El plan 2 (Intermedio) no tiene proveedor_precio_id.');
      console.warn(
        '[migrate:test] Para los tests de suscripciones/pagos, asígnale un Price de Stripe (modo test):',
      );
      console.warn(
        "[migrate:test]   UPDATE app_user.plan_alumno SET proveedor_precio_id = '<price_test>' WHERE id = 2;",
      );
    }
  } catch (e) {
    console.error('[migrate:test] Error consultando los planes de alumno:', e);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('');
  console.log('[migrate:test] Listo. Siguiente paso:');
  console.log('[migrate:test]   pnpm test:e2e -- --runInBand');
})().catch((e) => {
  console.error('[migrate:test] Error inesperado:', e);
  process.exit(1);
});