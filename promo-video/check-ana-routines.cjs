const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rutinasAsignadas = await prisma.usuarioRutina.findMany({
    where: { usuario: { correo: 'demo.alumno@ritmo.app' } },
    include: { rutina: true, diaSemana: true }
  });
  console.log('Rutinas asignadas a Ana:', rutinasAsignadas.map(r => ({
    id: r.id,
    dia: r.diaSemana.nombre,
    rutina: r.rutina.nombre
  })));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
