const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function check() {
  const users = await prisma.usuario.findMany({
    include: { alumno: true, entrenador: true }
  });
  console.log(users.map(u => ({
    id: u.id,
    correo: u.correo,
    nombre: u.nombre,
    role: u.role,
    idEntrenadorActual: u.alumno?.idEntrenadorActual
  })));
  await pool.end();
}
check().catch(console.error);
