const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const alumnos = await prisma.alumno.findMany({
    include: { usuario: true }
  });
  for (const a of alumnos) {
    console.log(a.usuario.nombre, '-> Entrenador:', a.idEntrenadorActual);
  }
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
