import { INestApplication } from '@nestjs/common';

import { limpiarDatos } from './db';

describe('limpiarDatos safety guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalResetFlag = process.env.E2E_ALLOW_DATABASE_RESET;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const app = {} as INestApplication;

  afterEach(() => {
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('E2E_ALLOW_DATABASE_RESET', originalResetFlag);
    restoreEnv('DATABASE_URL', originalDatabaseUrl);
  });

  it('rejects cleanup outside the test environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.E2E_ALLOW_DATABASE_RESET = 'true';

    await expect(limpiarDatos(app)).rejects.toThrow('NODE_ENV debe ser "test"');
  });

  it('requires explicit database reset confirmation', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.E2E_ALLOW_DATABASE_RESET;

    await expect(limpiarDatos(app)).rejects.toThrow(
      'E2E_ALLOW_DATABASE_RESET debe ser "true"',
    );
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
