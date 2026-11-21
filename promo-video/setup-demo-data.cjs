const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const entrenador = await prisma.usuario.findFirst({
    where: { correo: 'demo.entrenador@ritmo.app' }
  });
  console.log('Entrenador ID:', entrenador?.id);

  // Check routines
  const rutinas = await prisma.rutina.findMany({
    where: { createdByUsuario: entrenador?.id }
  });
  console.log('Rutinas de Mateo:', rutinas.map(r => ({ id: r.id, nombre: r.nombre })));

  // If Torso and Pierna don't exist, we can ensure they exist right here!
  let torso = rutinas.find(r => r.nombre.includes('Torso'));
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
    console.log('Created Torso:', torso.id);
  }

  let pierna = rutinas.find(r => r.nombre.includes('Pierna'));
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
    console.log('Created Pierna:', pierna.id);
  }

  // Ensure exercises exist in Torso
  const estandares = await prisma.ejercicioEstandar.findMany({ take: 5 });
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
          pesoObjetivo: 60,
        }
      });
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
