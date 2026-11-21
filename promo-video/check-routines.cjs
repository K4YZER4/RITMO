const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rutinas = await prisma.rutina.findMany({
    select: { id: true, nombre: true, activa: true }
  });
  console.log('Rutinas disponibles en DB:', rutinas);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
