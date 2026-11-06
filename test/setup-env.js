const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envTestPath = path.resolve(__dirname, '.env.test');
const envRaizPath = path.resolve(__dirname, '..', '.env');

if (!fs.existsSync(envTestPath)) {
  throw new Error(
    '[e2e] test/.env.test no existe. Copia test/.env.test.example y usa una base exclusiva de pruebas.',
  );
}

const resultado = dotenv.config({ path: envTestPath, override: true, quiet: true });

if (resultado.error) {
  throw resultado.error;
}

process.env.NODE_ENV = 'test';

if (fs.existsSync(envRaizPath)) {
  const envRaiz = dotenv.parse(fs.readFileSync(envRaizPath));

  if (envRaiz.DATABASE_URL && envRaiz.DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error('[e2e] DATABASE_URL coincide con la base principal. Ejecución cancelada.');
  }
}
