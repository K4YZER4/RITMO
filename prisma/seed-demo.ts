import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EstadoSuscripcionEnum, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PASSWORD = 'RitmoDemo2026!';

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const entrenador = await crearUsuario(
    'demo.entrenador@ritmo.app',
    'Mateo',
    'Ritmo',
    UserRole.entrenador,
    hashedPassword,
  );
  await prisma.entrenador.upsert({
    where: { idUsuario: entrenador.id },
    update: { nombrePublico: 'Mateo Coach', idPlan: 1 },
    create: {
      idUsuario: entrenador.id,
      slug: 'mateo-coach-demo',
      nombrePublico: 'Mateo Coach',
      fechaEntrenador: new Date('2020-01-01'),
      idPlan: 1,
    },
  });
  await asegurarSuscripcion(entrenador.id, 'entrenador');

  const alumnos = await Promise.all([
    crearAlumno('demo.alumno@ritmo.app', 'Ana', 'Fuerza', entrenador.id, hashedPassword),
    crearAlumno('demo.alumna@ritmo.app', 'Sofía', 'Progreso', entrenador.id, hashedPassword),
    crearAlumno('demo.atleta@ritmo.app', 'Diego', 'Ritmo', entrenador.id, hashedPassword),
  ]);

  const ejercicio =
    (await prisma.ejercicioEstandar.findFirst({ where: { nombre: 'Press de banca' } })) ??
    (await prisma.ejercicioEstandar.create({
      data: {
        nombre: 'Press de banca',
        descripcion: 'Empuje horizontal para pecho, hombro y tríceps.',
      },
    }));

  const rutina = await prisma.rutina.upsert({
    where: {
      createdByUsuario_nombre: {
        createdByUsuario: entrenador.id,
        nombre: 'Fuerza · Tren superior',
      },
    },
    update: { descripcion: 'Sesión demo enfocada en fuerza y técnica.', activa: true },
    create: {
      createdByUsuario: entrenador.id,
      nombre: 'Fuerza · Tren superior',
      descripcion: 'Sesión demo enfocada en fuerza y técnica.',
    },
  });
  const ejercicioExistente = await prisma.rutinaEjercicio.findFirst({
    where: { idRutina: rutina.id, orden: 1 },
  });
  const datosEjercicio = {
    idEjercicioEstandar: ejercicio.id,
    idEjercicioPersonalizado: null,
    orden: 1,
    series: 4,
    repeticiones: 8,
    pesoObjetivo: 80,
    notaEntrenador: 'Controla la bajada y mantén los pies firmes.',
  };
  const rutinaEjercicio = ejercicioExistente
    ? await prisma.rutinaEjercicio.update({
        where: { id: ejercicioExistente.id },
        data: datosEjercicio,
      })
    : await prisma.rutinaEjercicio.create({
        data: { idRutina: rutina.id, ...datosEjercicio },
      });

  const fechaInicio = new Date('2026-01-01T00:00:00.000Z');
  for (const alumno of alumnos) {
    for (let dia = 1; dia <= 7; dia += 1) {
      await prisma.usuarioRutina.upsert({
        where: {
          idUsuario_idRutina_idDiaSemana_fechaInicio: {
            idUsuario: alumno.id,
            idRutina: rutina.id,
            idDiaSemana: dia,
            fechaInicio,
          },
        },
        update: { activa: true, fechaFin: null, asignadaPorUsuario: entrenador.id },
        create: {
          idUsuario: alumno.id,
          idRutina: rutina.id,
          idDiaSemana: dia,
          fechaInicio,
          asignadaPorUsuario: entrenador.id,
        },
      });
    }
  }

  const asignacion = await prisma.usuarioRutina.findFirstOrThrow({
    where: { idUsuario: alumnos[0].id, idRutina: rutina.id, idDiaSemana: 1 },
  });
  let sesion = await prisma.sesionEntrenamiento.findFirst({
    where: { idUsuario: alumnos[0].id, notasAlumno: 'Sesión de demostración' },
  });
  if (!sesion) {
    const fechaSesion = new Date();
    fechaSesion.setUTCDate(fechaSesion.getUTCDate() - 2);
    sesion = await prisma.sesionEntrenamiento.create({
      data: {
        idUsuario: alumnos[0].id,
        idUsuarioRutina: asignacion.id,
        idRutina: rutina.id,
        fechaSesion,
        idEstado: 2,
        duracionMinutos: 52,
        notasAlumno: 'Sesión de demostración',
        createdBy: alumnos[0].id,
        sesionEjercicio: {
          create: {
            idRutinaEjercicio: rutinaEjercicio.id,
            idEjercicioEstandar: ejercicio.id,
            orden: 1,
            sesionEjercicioSet: {
              create: [1, 2, 3, 4].map((numeroSet) => ({
                numeroSet,
                repeticionesObjetivo: 8,
                pesoObjetivo: 80,
                repeticionesRealizadas: 8,
                pesoReal: 85,
                completado: true,
              })),
            },
          },
        },
      },
    });
  }

  const setDemo = await prisma.sesionEjercicioSet.findFirstOrThrow({
    where: { sesionEjercicio: { idSesionEntrenamiento: sesion.id } },
  });
  const prExistente = await prisma.alumnoEjercicioPr.findFirst({
    where: { idUsuario: alumnos[0].id, idEjercicioEstandar: ejercicio.id, peso: 85 },
  });
  if (!prExistente) {
    await prisma.alumnoEjercicioPr.create({
      data: {
        idUsuario: alumnos[0].id,
        idEjercicioEstandar: ejercicio.id,
        peso: 85,
        repeticiones: 8,
        idSesionEjercicioSet: setDemo.id,
        fechaPr: sesion.fechaSesion,
      },
    });
  }

  await prisma.usuarioMedicion.upsert({
    where: {
      idUsuario_fechaMedicion: {
        idUsuario: alumnos[0].id,
        fechaMedicion: new Date('2026-11-01T00:00:00.000Z'),
      },
    },
    update: { pesoKg: 75.5, grasaCorporalPct: 18 },
    create: {
      idUsuario: alumnos[0].id,
      fechaMedicion: new Date('2026-11-01T00:00:00.000Z'),
      pesoKg: 75.5,
      grasaCorporalPct: 18,
    },
  });

  console.log('Demo data ready.');
  console.log('Trainer: demo.entrenador@ritmo.app');
  console.log('Student: demo.alumno@ritmo.app');
}

async function crearUsuario(
  correo: string,
  nombre: string,
  apellidoPaterno: string,
  role: UserRole,
  hashedPassword: string,
) {
  return prisma.usuario.upsert({
    where: { correo },
    update: { nombre, apellidoPaterno, role, hashedPassword },
    create: {
      correo,
      nombre,
      apellidoPaterno,
      role,
      hashedPassword,
      idSexo: 1,
      fechaNacimiento: new Date('1995-01-01'),
    },
  });
}

async function crearAlumno(
  correo: string,
  nombre: string,
  apellido: string,
  entrenadorId: string,
  hashedPassword: string,
) {
  const usuario = await crearUsuario(
    correo,
    nombre,
    apellido,
    UserRole.alumnoConEntrenador,
    hashedPassword,
  );
  await prisma.alumno.upsert({
    where: { idUsuario: usuario.id },
    update: { idEntrenadorActual: entrenadorId, idPlan: 1, idObjetivo: 2, idNivelActividad: 3 },
    create: {
      idUsuario: usuario.id,
      idEntrenadorActual: entrenadorId,
      idPlan: 1,
      idObjetivo: 2,
      idNivelActividad: 3,
      fechaInicioEntrenamiento: new Date('2025-01-01'),
    },
  });
  await asegurarSuscripcion(usuario.id, 'alumno');
  return usuario;
}

async function asegurarSuscripcion(usuarioId: string, tipo: 'alumno' | 'entrenador') {
  const where = tipo === 'alumno' ? { alumnoId: usuarioId } : { entrenadorId: usuarioId };
  const existente = await prisma.suscripcion.findFirst({ where });
  if (existente) return;
  await prisma.suscripcion.create({
    data: {
      ...where,
      ...(tipo === 'alumno' ? { planAlumnoId: 1 } : { planEntrenadorId: 1 }),
      estado: EstadoSuscripcionEnum.activa,
      periodoActualInicio: new Date(),
      vitalicia: true,
      planNombreSnapshot: 'Demo',
      precioSnapshot: 0,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
