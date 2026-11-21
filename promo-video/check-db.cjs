const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const ana = await prisma.alumno.findFirst({
    where: { usuario: { correo: 'demo.alumno@ritmo.app' } },
    include: { usuario: true }
  });
  console.log('Ana data:', {
    lesionesActuales: ana?.lesionesActuales,
    lesionesPasadas: ana?.lesionesPasadas,
    observacionesMedicas: ana?.observacionesMedicas,
  });
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
