const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function resetDemoFull() {
  console.log('--- Resetting DB for Full Real Demo ---');
  
  const ana = await prisma.usuario.findFirst({
    where: { correo: 'demo.alumno@ritmo.app' }
  });
  if (!ana) throw new Error('Ana no encontrada');

  const entrenador = await prisma.usuario.findFirst({
    where: { correo: 'demo.entrenador@ritmo.app' }
  });
  if (!entrenador) throw new Error('Entrenador no encontrado');

  // 1. Unlink Ana and set role to 'alumno'
  await prisma.usuario.update({
    where: { id: ana.id },
    data: { role: 'alumno' }
  });

  await prisma.alumno.update({
    where: { idUsuario: ana.id },
    data: {
      idEntrenadorActual: null,
      lesionesActuales: 'Molestia leve en tendón rotuliano derecho (evitar flexión profunda con rebote).',
      lesionesPasadas: 'Esguince de tobillo grado 1 (2025). Recuperada con alta médica.',
      observacionesMedicas: 'Apta para hipertrofia; priorizar calentamiento dinámico y extensiones controladas.',
    }
  });

  // Revoke any pending tokens so generation is fresh
  await prisma.tokenVinculacionAlumno.updateMany({
    where: { idAlumno: ana.id, usadoEn: null },
    data: { revocadoEn: new Date() }
  });

  console.log('1. Ana unlinked, role set to alumno, and medical sheet updated.');

  // 2. Expire old assigned routines for Ana so her current week is clean without breaking FKs
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const updatedRutinas = await prisma.usuarioRutina.updateMany({
    where: { idUsuario: ana.id },
    data: { activa: false, fechaFin: yesterday }
  });
  console.log(`2. Expired ${updatedRutinas.count} old routine assignments for Ana.`);

  // 3. Ensure Torso and Pierna exist for Mateo
  let torso = await prisma.rutina.findFirst({
    where: { createdByUsuario: entrenador.id, nombre: 'Torso · Tren superior' }
  });
  if (!torso) {
    torso = await prisma.rutina.create({
      data: {
        nombre: 'Torso · Tren superior',
        descripcion: 'Sesión completa de empuje y tirón para fuerza e hipertrofia del torso.',
        activa: true,
        idCategoriaRutina: 2,
        createdByUsuario: entrenador.id,
      }
    });
    console.log('3a. Created Torso routine.');
  }

  let pierna = await prisma.rutina.findFirst({
    where: { createdByUsuario: entrenador.id, nombre: 'Pierna · Tren inferior' }
  });
  if (!pierna) {
    pierna = await prisma.rutina.create({
      data: {
        nombre: 'Pierna · Tren inferior',
        descripcion: 'Sentadilla, prensa y femorales con enfoque de hipertrofia.',
        activa: true,
        idCategoriaRutina: 2,
        createdByUsuario: entrenador.id,
      }
    });
    console.log('3b. Created Pierna routine.');
  }

  // Ensure exercises in Torso
  const estandares = await prisma.ejercicioEstandar.findMany({ take: 4 });
  for (let i = 0; i < estandares.length; i++) {
    const ej = estandares[i];
    const exists = await prisma.rutinaEjercicio.findFirst({
      where: { idRutina: torso.id, idEjercicioEstandar: ej.id }
    });
    if (!exists) {
      await prisma.rutinaEjercicio.create({
        data: {
          idRutina: torso.id,
          idEjercicioEstandar: ej.id,
          orden: i + 1,
          series: 3,
          repeticiones: 10,
          pesoObjetivo: 50 + i * 10,
        }
      });
    }
  }

  console.log('4. Torso & Pierna routines verified in Coach library.');
  console.log('--- Reset Complete ---');
}

async function close() {
  await prisma.$disconnect();
  await pool.end();
}

module.exports = { resetDemoFull, close };

if (require.main === module) {
  resetDemoFull().then(() => close());
}
