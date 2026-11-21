const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const ana = await prisma.usuario.findFirst({
    where: { correo: 'demo.alumno@ritmo.app' },
    include: {
      sesionEntrenamiento: { include: { rutina: true } },
      alumnoEjercicioPr: { include: { ejercicioEstandar: true } },
      usuarioMedicion: true,
    }
  });

  console.log('Ana sesiones:', ana?.sesionEntrenamiento?.length);
  console.log('Ana PRs:', ana?.alumnoEjercicioPr?.length);
  console.log('Ana mediciones:', ana?.usuarioMedicion?.length);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
