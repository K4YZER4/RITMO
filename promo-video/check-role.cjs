const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const ana = await prisma.usuario.findFirst({
    where: { correo: 'demo.alumno@ritmo.app' }
  });
  console.log('Ana usuario:', {
    id: ana.id,
    role: ana.role,
    idRol: ana.idRol,
  });
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
