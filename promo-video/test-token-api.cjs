const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async () => {
  // Set Ana role to 'alumno' and idEntrenadorActual to null
  const ana = await prisma.usuario.findFirst({ where: { correo: 'demo.alumno@ritmo.app' } });
  await prisma.usuario.update({ where: { id: ana.id }, data: { role: 'alumno' } });
  await prisma.alumno.update({ where: { idUsuario: ana.id }, data: { idEntrenadorActual: null } });
  console.log('Ana updated to role: alumno');

  // 1. Login as Ana
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correo: 'demo.alumno@ritmo.app',
      password: 'RitmoDemo2026!'
    })
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status, 'Token:', loginData.token ? 'YES' : loginData);

  // 2. Call /alumno-entrenador/token
  const tokenRes = await fetch('http://localhost:3001/alumno-entrenador/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    }
  });
  const tokenData = await tokenRes.json();
  console.log('Token status:', tokenRes.status, 'Data:', tokenData);

  await prisma.$disconnect();
  await pool.end();
})();
