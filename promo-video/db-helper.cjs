const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function resetForCapture() {
  // Set realistic injuries for Ana
  await prisma.alumno.updateMany({
    where: { usuario: { correo: 'demo.alumno@ritmo.app' } },
    data: {
      idEntrenadorActual: null,
      lesionesActuales: 'Molestia leve en tendón rotuliano derecho (evitar flexión profunda con rebote).',
      lesionesPasadas: 'Esguince de tobillo grado 1 (2025). Recuperada con alta médica.',
      observacionesMedicas: 'Apta para hipertrofia; priorizar calentamiento dinámico y extensiones controladas.',
    }
  });
  console.log('[DB] Ana unlinked and injuries seeded for demo.');
}

async function close() {
  await prisma.$disconnect();
  await pool.end();
}

module.exports = { resetForCapture, close, prisma };

if (require.main === module) {
  resetForCapture().then(() => close());
}
