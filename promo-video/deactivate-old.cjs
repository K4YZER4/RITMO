const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  const ana = await prisma.usuario.findFirst({ where: { correo: 'demo.alumno@ritmo.app' } });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.usuarioRutina.updateMany({
    where: { idUsuario: ana.id },
    data: { activa: false, fechaFin: yesterday }
  });
  console.log('Set all previous usuarioRutina of Ana to activa: false');
  await prisma.$disconnect();
  await pool.end();
})();
