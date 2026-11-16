import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EstadoSuscripcionEnum, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const PASSWORD = 'RitmoDemo2026!';

interface AlumnoSeedInfo {
  correo: string;
  nombre: string;
  apellido: string;
  idObjetivo: number;
  idNivelActividad: number;
  pesoKg: number;
  grasaPct: number;
  observaciones: string;
  lesionesActuales: string;
  lesionesPasadas: string;
  numeroCelular: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  sesionesCount: number;
}

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 0. Planes oficiales con límites exactos
  await prisma.planEntrenador.update({
    where: { id: 1 },
    data: {
      limiteAlumnos: 4,
      limiteRutinas: 3,
      descripcion: 'Acceso gratuito limitado: hasta 4 alumnos y 3 rutinas.',
    },
  });
  await prisma.planEntrenador.update({
    where: { id: 2 },
    data: {
      limiteAlumnos: 20,
      limiteRutinas: 30,
      descripcion: 'Plan mensual para entrenadores con cartera en crecimiento: hasta 20 alumnos y 30 rutinas.',
    },
  });
  await prisma.planEntrenador.update({
    where: { id: 3 },
    data: {
      limiteAlumnos: 30,
      limiteRutinas: 45,
      descripcion: 'Plan mensual para entrenadores con mayor volumen de alumnos y rutinas: hasta 30 alumnos y 45 rutinas.',
    },
  });

  await prisma.planAlumno.update({
    where: { id: 1 },
    data: {
      limiteRutinas: 5,
      descripcion: 'Plan gratuito permanente para alumnos independientes: hasta 5 rutinas.',
    },
  });
  await prisma.planAlumno.update({
    where: { id: 2 },
    data: {
      limiteRutinas: 10,
      descripcion: 'Plan mensual para alumnos que requieren más rutinas y ejercicios personalizados: hasta 10 rutinas.',
    },
  });
  await prisma.planAlumno.update({
    where: { id: 3 },
    data: {
      limiteRutinas: 15,
      descripcion: 'Plan mensual con límites ampliados para alumnos independientes: hasta 15 rutinas.',
    },
  });

  // 1. Entrenador Demo (Mateo Coach en Plan Básico - 4 alumnos y 3 rutinas)
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
  await asegurarSuscripcion(entrenador.id, 'entrenador', 1);

  // 2. Biblioteca de Ejercicios Estándar
  const ejerciciosDef = [
    { nombre: 'Press de banca', descripcion: 'Empuje horizontal en banco plano para pectoral mayor, deltoides anterior y tríceps.' },
    { nombre: 'Remo con barra', descripcion: 'Tirón horizontal con barra para dorsal ancho, trapecio y bíceps.' },
    { nombre: 'Press militar', descripcion: 'Empuje vertical con barra para deltoides y tríceps con core activo.' },
    { nombre: 'Dominadas / Jalón', descripcion: 'Tirón vertical para amplitud dorsal y flexores de codo.' },
    { nombre: 'Curl de bíceps', descripcion: 'Aislamiento de flexores de codo con mancuernas manteniendo codos fijos.' },
    { nombre: 'Sentadilla con barra', descripcion: 'Patrón dominante de rodilla para cuádriceps, glúteos y estabilidad de tronco.' },
    { nombre: 'Peso muerto rumano', descripcion: 'Bisagra de cadera enfocado en isquiotibiales y glúteos con columna neutra.' },
    { nombre: 'Prensa de piernas', descripcion: 'Empuje de tren inferior en máquina con trayectoria guiada para cuádriceps.' },
    { nombre: 'Zancadas', descripcion: 'Trabajo unilateral de piernas enfocado en glúteos y estabilidad pélvica.' },
    { nombre: 'Plancha abdominal', descripcion: 'Anti-extensión lumbar isométrica para activación profunda del core.' },
  ];

  const ejerciciosMap = new Map<string, any>();
  for (const def of ejerciciosDef) {
    let ej = await prisma.ejercicioEstandar.findFirst({ where: { nombre: def.nombre } });
    if (!ej) {
      ej = await prisma.ejercicioEstandar.create({ data: def });
    }
    ejerciciosMap.set(def.nombre, ej);
  }

  // 2.2 Biblioteca de Ejercicios Personalizados del Entrenador Mateo
  const personalizadosDef = [
    {
      nombre: 'Elevaciones laterales en polea',
      descripcion: 'Aislamiento de deltoides lateral con tensión constante en todo el rango de movimiento.',
      urlImagen: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
      linkInformacion: 'https://es.wikipedia.org/wiki/Elevaci%C3%B3n_lateral',
      musculos: [3], // HOMBROS
      equipos: [6],  // POLEA
    },
    {
      nombre: 'Hip Thrust con barra',
      descripcion: 'Máxima activación del glúteo mayor y cadena posterior con apoyo dorsal en banco.',
      urlImagen: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
      linkInformacion: 'https://es.wikipedia.org/wiki/Hip_thrust',
      musculos: [8, 7], // GLUTEOS, FEMORALES
      equipos: [1, 4],  // BARRA, BANCA
    },
    {
      nombre: 'Face Pull con cuerda en polea',
      descripcion: 'Trabajo correctivo para deltoides posterior, romboides y salud del manguito rotador.',
      urlImagen: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
      linkInformacion: 'https://es.wikipedia.org/wiki/Manguito_rotador',
      musculos: [2, 3], // ESPALDA, HOMBROS
      equipos: [6],     // POLEA
    },
    {
      nombre: 'Paseo del granjero con mancuernas',
      descripcion: 'Carga pesada unilateral y bilateral para fuerza de agarre, trapecios y rigidez del core.',
      urlImagen: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
      linkInformacion: 'https://es.wikipedia.org/wiki/Paseo_del_granjero',
      musculos: [10, 2], // CORE, ESPALDA
      equipos: [2],      // MANCUERNAS
    },
  ];

  const personalizadosMap = new Map<string, any>();
  for (const p of personalizadosDef) {
    const ej = await prisma.ejercicioPersonalizado.upsert({
      where: {
        createdByUsuario_nombre: {
          createdByUsuario: entrenador.id,
          nombre: p.nombre,
        },
      },
      update: {
        descripcion: p.descripcion,
        urlImagen: p.urlImagen,
        linkInformacion: p.linkInformacion,
        activa: true,
      },
      create: {
        createdByUsuario: entrenador.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        urlImagen: p.urlImagen,
        linkInformacion: p.linkInformacion,
        activa: true,
      },
    });
    personalizadosMap.set(p.nombre, ej);

    for (const mId of p.musculos) {
      await prisma.ejercicioPersonalizadoMusculo.upsert({
        where: {
          idEjercicioPersonalizado_idMusculo: {
            idEjercicioPersonalizado: ej.id,
            idMusculo: BigInt(mId),
          },
        },
        update: {},
        create: {
          idEjercicioPersonalizado: ej.id,
          idMusculo: BigInt(mId),
        },
      });
    }

    for (const eqId of p.equipos) {
      await prisma.ejercicioPersonalizadoEquipo.upsert({
        where: {
          idEjercicioPersonalizado_idEquipo: {
            idEjercicioPersonalizado: ej.id,
            idEquipo: BigInt(eqId),
          },
        },
        update: {},
        create: {
          idEjercicioPersonalizado: ej.id,
          idEquipo: BigInt(eqId),
        },
      });
    }
  }

  // 3. Crear las Rutinas Realistas (Split Torso / Pierna + Especial Coach)
  await prisma.rutina.updateMany({
    where: {
      createdByUsuario: entrenador.id,
      OR: [{ nombre: 'Prueba' }, { nombre: { startsWith: 'QA Frontend' } }],
    },
    data: { activa: false },
  });

  // Rutina A: Torso · Tren Superior
  const rutinaTorso = await prisma.rutina.upsert({
    where: {
      createdByUsuario_nombre: {
        createdByUsuario: entrenador.id,
        nombre: 'Torso · Tren superior',
      },
    },
    update: {
      descripcion: 'Sesión completa de empuje y tirón para fuerza e hipertrofia del torso.',
      activa: true,
      idCategoriaRutina: 2,
    },
    create: {
      createdByUsuario: entrenador.id,
      nombre: 'Torso · Tren superior',
      descripcion: 'Sesión completa de empuje y tirón para fuerza e hipertrofia del torso.',
      idCategoriaRutina: 2,
    },
  });

  const ejerciciosTorso = [
    { nombre: 'Press de banca', esPersonalizado: false, orden: 1, series: 4, repeticiones: 8, pesoObjetivo: 80, nota: 'Retracción escapular firme y pausa breve en el pecho.' },
    { nombre: 'Remo con barra', esPersonalizado: false, orden: 2, series: 4, repeticiones: 8, pesoObjetivo: 75, nota: 'Torso a 45 grados, tira guiando con los codos.' },
    { nombre: 'Press militar', esPersonalizado: false, orden: 3, series: 3, repeticiones: 10, pesoObjetivo: 45, nota: 'Aprieta glúteos y abdomen para no arquear la zona lumbar.' },
    { nombre: 'Dominadas / Jalón', esPersonalizado: false, orden: 4, series: 3, repeticiones: 10, pesoObjetivo: 65, nota: 'Rango de recorrido completo, desciende con control.' },
    { nombre: 'Elevaciones laterales en polea', esPersonalizado: true, orden: 5, series: 3, repeticiones: 12, pesoObjetivo: 12, nota: 'Tensión constante en deltoides lateral, sin balanceos.' },
  ];

  for (const ej of ejerciciosTorso) {
    const estandar = ej.esPersonalizado ? null : ejerciciosMap.get(ej.nombre);
    const personalizado = ej.esPersonalizado ? personalizadosMap.get(ej.nombre) : null;
    const existente = await prisma.rutinaEjercicio.findFirst({
      where: { idRutina: rutinaTorso.id, orden: ej.orden },
    });
    const datos = {
      idEjercicioEstandar: estandar?.id ?? null,
      idEjercicioPersonalizado: personalizado?.id ?? null,
      orden: ej.orden,
      series: ej.series,
      repeticiones: ej.repeticiones,
      pesoObjetivo: ej.pesoObjetivo,
      notaEntrenador: ej.nota,
    };
    if (existente) {
      await prisma.rutinaEjercicio.update({ where: { id: existente.id }, data: datos });
    } else {
      await prisma.rutinaEjercicio.create({ data: { idRutina: rutinaTorso.id, ...datos } });
    }
  }

  // Rutina B: Pierna · Tren Inferior
  const rutinaPierna = await prisma.rutina.upsert({
    where: {
      createdByUsuario_nombre: {
        createdByUsuario: entrenador.id,
        nombre: 'Pierna · Tren inferior',
      },
    },
    update: {
      descripcion: 'Enfoque integral en cuádriceps, cadena posterior y estabilidad del core.',
      activa: true,
      idCategoriaRutina: 2,
    },
    create: {
      createdByUsuario: entrenador.id,
      nombre: 'Pierna · Tren inferior',
      descripcion: 'Enfoque integral en cuádriceps, cadena posterior y estabilidad del core.',
      idCategoriaRutina: 2,
    },
  });

  const ejerciciosPierna = [
    { nombre: 'Sentadilla con barra', esPersonalizado: false, orden: 1, series: 4, repeticiones: 8, pesoObjetivo: 100, nota: 'Rompe el paralelo, rodillas en línea con las puntas.' },
    { nombre: 'Hip Thrust con barra', esPersonalizado: true, orden: 2, series: 4, repeticiones: 10, pesoObjetivo: 110, nota: 'Apoyo firme en banco, aprieta 1 segundo arriba.' },
    { nombre: 'Peso muerto rumano', esPersonalizado: false, orden: 3, series: 4, repeticiones: 8, pesoObjetivo: 95, nota: 'Bisagra de cadera pura, siente la tensión en los isquios.' },
    { nombre: 'Prensa de piernas', esPersonalizado: false, orden: 4, series: 3, repeticiones: 10, pesoObjetivo: 160, nota: 'No bloquees las rodillas al extender, bajada suave.' },
    { nombre: 'Plancha abdominal', esPersonalizado: false, orden: 5, series: 3, repeticiones: 1, pesoObjetivo: 0, nota: 'Sostén 45 segundos con glúteos y abdomen contraídos.' },
  ];

  for (const ej of ejerciciosPierna) {
    const estandar = ej.esPersonalizado ? null : ejerciciosMap.get(ej.nombre);
    const personalizado = ej.esPersonalizado ? personalizadosMap.get(ej.nombre) : null;
    const existente = await prisma.rutinaEjercicio.findFirst({
      where: { idRutina: rutinaPierna.id, orden: ej.orden },
    });
    const datos = {
      idEjercicioEstandar: estandar?.id ?? null,
      idEjercicioPersonalizado: personalizado?.id ?? null,
      orden: ej.orden,
      series: ej.series,
      repeticiones: ej.repeticiones,
      pesoObjetivo: ej.pesoObjetivo,
      notaEntrenador: ej.nota,
    };
    if (existente) {
      await prisma.rutinaEjercicio.update({ where: { id: existente.id }, data: datos });
    } else {
      await prisma.rutinaEjercicio.create({ data: { idRutina: rutinaPierna.id, ...datos } });
    }
  }

  // Rutina C: Accesorios y Core · Especial Coach Mateo
  const rutinaAccesorios = await prisma.rutina.upsert({
    where: {
      createdByUsuario_nombre: {
        createdByUsuario: entrenador.id,
        nombre: 'Accesorios & Core · Especial Coach',
      },
    },
    update: {
      descripcion: 'Rutina complementaria de aislamiento y estabilidad con ejercicios exclusivos del Coach Mateo.',
      activa: true,
      idCategoriaRutina: 2,
    },
    create: {
      createdByUsuario: entrenador.id,
      nombre: 'Accesorios & Core · Especial Coach',
      descripcion: 'Rutina complementaria de aislamiento y estabilidad con ejercicios exclusivos del Coach Mateo.',
      idCategoriaRutina: 2,
    },
  });

  const ejerciciosAccesorios = [
    { nombre: 'Hip Thrust con barra', esPersonalizado: true, orden: 1, series: 3, repeticiones: 12, pesoObjetivo: 90, nota: 'Enfoque en bombeo de glúteo y cadera.' },
    { nombre: 'Elevaciones laterales en polea', esPersonalizado: true, orden: 2, series: 4, repeticiones: 15, pesoObjetivo: 10, nota: 'Tensión continua y apertura lateral controlada.' },
    { nombre: 'Face Pull con cuerda en polea', esPersonalizado: true, orden: 3, series: 4, repeticiones: 15, pesoObjetivo: 25, nota: 'Codos altos y rotación externa al final.' },
    { nombre: 'Paseo del granjero con mancuernas', esPersonalizado: true, orden: 4, series: 3, repeticiones: 12, pesoObjetivo: 24, nota: 'Camina a paso firme sin oscilar los hombros.' },
    { nombre: 'Plancha abdominal', esPersonalizado: false, orden: 5, series: 3, repeticiones: 1, pesoObjetivo: 0, nota: 'Sostén 60 segundos con máxima activación del core.' },
  ];

  for (const ej of ejerciciosAccesorios) {
    const estandar = ej.esPersonalizado ? null : ejerciciosMap.get(ej.nombre);
    const personalizado = ej.esPersonalizado ? personalizadosMap.get(ej.nombre) : null;
    const existente = await prisma.rutinaEjercicio.findFirst({
      where: { idRutina: rutinaAccesorios.id, orden: ej.orden },
    });
    const datos = {
      idEjercicioEstandar: estandar?.id ?? null,
      idEjercicioPersonalizado: personalizado?.id ?? null,
      orden: ej.orden,
      series: ej.series,
      repeticiones: ej.repeticiones,
      pesoObjetivo: ej.pesoObjetivo,
      notaEntrenador: ej.nota,
    };
    if (existente) {
      await prisma.rutinaEjercicio.update({ where: { id: existente.id }, data: datos });
    } else {
      await prisma.rutinaEjercicio.create({ data: { idRutina: rutinaAccesorios.id, ...datos } });
    }
  }

  // 4. Lista de 5 Alumnos Realistas
  const alumnosData: AlumnoSeedInfo[] = [
    {
      correo: 'demo.alumno@ritmo.app',
      nombre: 'Ana',
      apellido: 'Fuerza',
      idObjetivo: 3, // Fuerza
      idNivelActividad: 4, // Activo
      pesoKg: 64.5,
      grasaPct: 21,
      observaciones: 'Enfoque en progresión de básicos y levantamientos principales. Buena técnica y capacidad de recuperación.',
      lesionesActuales: 'Ninguna molestia activa.',
      lesionesPasadas: 'Esguince de tobillo grado 1 (2023, recuperada).',
      numeroCelular: '+52 55 1234 5678',
      contactoEmergenciaNombre: 'Carlos Fuerza',
      contactoEmergenciaTelefono: '+52 55 9876 5432',
      sesionesCount: 14,
    },
    {
      correo: 'demo.alumna@ritmo.app',
      nombre: 'Sofía',
      apellido: 'Progreso',
      idObjetivo: 2, // Ganancia muscular
      idNivelActividad: 3, // Moderado
      pesoKg: 58.0,
      grasaPct: 23,
      observaciones: 'Entrenamiento enfocado en tren inferior e hipertrofia. Cuidar descansos interseries.',
      lesionesActuales: 'Molestia leve en muñeca izquierda al cargar peso excesivo (usar muñequeras en press).',
      lesionesPasadas: 'Tendinitis rotuliana derecha en 2022 (asintomática actualmente).',
      numeroCelular: '+52 55 2345 6789',
      contactoEmergenciaNombre: 'Laura Progreso',
      contactoEmergenciaTelefono: '+52 55 8765 4321',
      sesionesCount: 9,
    },
    {
      correo: 'demo.atleta@ritmo.app',
      nombre: 'Diego',
      apellido: 'Ritmo',
      idObjetivo: 1, // Pérdida de grasa
      idNivelActividad: 5, // Muy activo
      pesoKg: 82.5,
      grasaPct: 18,
      observaciones: 'Déficit calórico controlado + mantenimiento de masa muscular y fuerza en básicos.',
      lesionesActuales: 'Ligera sobrecarga en deltoides posterior tras días de empuje intenso.',
      lesionesPasadas: 'Ninguna lesión articular previa.',
      numeroCelular: '+52 55 3456 7890',
      contactoEmergenciaNombre: 'Mariana Ritmo',
      contactoEmergenciaTelefono: '+52 55 7654 3210',
      sesionesCount: 22,
    },
    {
      correo: 'demo.carlos@ritmo.app',
      nombre: 'Carlos',
      apellido: 'Hipertrofia',
      idObjetivo: 2, // Ganancia muscular
      idNivelActividad: 4, // Activo
      pesoKg: 76.0,
      grasaPct: 15,
      observaciones: 'Foco en volumen en torso y espalda. Excelente disciplina y adherencia al plan de descanso.',
      lesionesActuales: 'Ninguna molestia activa.',
      lesionesPasadas: 'Contractura lumbar ocasional por postura laboral (recomendar estiramientos de psoas e isquios).',
      numeroCelular: '+52 55 4567 8901',
      contactoEmergenciaNombre: 'Roberto Hipertrofia',
      contactoEmergenciaTelefono: '+52 55 6543 2109',
      sesionesCount: 18,
    },
    {
      correo: 'demo.valentina@ritmo.app',
      nombre: 'Valentina',
      apellido: 'Salud',
      idObjetivo: 5, // Salud general
      idNivelActividad: 2, // Ligero
      pesoKg: 61.2,
      grasaPct: 25,
      observaciones: 'Reacondicionamiento físico postural, trabajo de core y movilidad articular.',
      lesionesActuales: 'Tensión cervical recurrente por trabajo sedentario.',
      lesionesPasadas: 'Meniscectomía parcial rodilla derecha (2021, evitar impacto excesivo en saltos).',
      numeroCelular: '+52 55 5678 9012',
      contactoEmergenciaNombre: 'Fernando Salud',
      contactoEmergenciaTelefono: '+52 55 5432 1098',
      sesionesCount: 6,
    },
  ];

  const fechaInicio = new Date('2026-01-01T00:00:00.000Z');

  for (const a of alumnosData) {
    const esIndependiente = a.correo === 'demo.valentina@ritmo.app';
    const role = esIndependiente ? UserRole.alumno : UserRole.alumnoConEntrenador;
    const usuario = await crearUsuario(a.correo, a.nombre, a.apellido, role, hashedPassword);

    await prisma.alumno.upsert({
      where: { idUsuario: usuario.id },
      update: {
        idEntrenadorActual: esIndependiente ? null : entrenador.id,
        idPlan: 1,
        idObjetivo: a.idObjetivo,
        idNivelActividad: a.idNivelActividad,
        observacionesMedicas: a.observaciones,
        lesionesActuales: a.lesionesActuales,
        lesionesPasadas: a.lesionesPasadas,
        numeroCelular: a.numeroCelular,
        contactoEmergenciaNombre: a.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: a.contactoEmergenciaTelefono,
      },
      create: {
        idUsuario: usuario.id,
        idEntrenadorActual: esIndependiente ? null : entrenador.id,
        idPlan: 1,
        idObjetivo: a.idObjetivo,
        idNivelActividad: a.idNivelActividad,
        observacionesMedicas: a.observaciones,
        lesionesActuales: a.lesionesActuales,
        lesionesPasadas: a.lesionesPasadas,
        numeroCelular: a.numeroCelular,
        contactoEmergenciaNombre: a.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: a.contactoEmergenciaTelefono,
        fechaInicioEntrenamiento: new Date('2025-01-01'),
      },
    });
    await asegurarSuscripcion(usuario.id, 'alumno');

    // Mediciones
    await prisma.usuarioMedicion.upsert({
      where: {
        idUsuario_fechaMedicion: {
          idUsuario: usuario.id,
          fechaMedicion: new Date('2026-11-01T00:00:00.000Z'),
        },
      },
      update: { pesoKg: a.pesoKg, grasaCorporalPct: a.grasaPct },
      create: {
        idUsuario: usuario.id,
        fechaMedicion: new Date('2026-11-01T00:00:00.000Z'),
        pesoKg: a.pesoKg,
        grasaCorporalPct: a.grasaPct,
      },
    });

    // Si es Valentina (independiente), preparamos token de vinculación demo para probar el límite
    if (esIndependiente) {
      const codigo = 'VALE2026';
      const secreto = 'vale1234';
      const codigoHash = crypto.createHash('sha256').update(codigo).digest('hex');
      const secretoHash = crypto.createHash('sha256').update(secreto).digest('hex');

      await prisma.tokenVinculacionAlumno.deleteMany({ where: { idAlumno: usuario.id } });
      await prisma.tokenVinculacionAlumno.create({
        data: {
          idAlumno: usuario.id,
          codigoHash,
          secretoHash,
          expiraEn: new Date('2028-01-01T00:00:00.000Z'),
        },
      });

      // Aseguramos que no tenga rutinas asignadas del entrenador
      await prisma.usuarioRutina.updateMany({
        where: { idUsuario: usuario.id },
        data: { activa: false },
      });
      continue;
    }

    // 5. Asignación Semanal Realista (Split Torso / Pierna)
    // Distribución semanal por alumno (Torso, Pierna y Especial Coach Mateo)
    const asignacionesDias = [
      { dia: 1, rutina: rutinaTorso },
      { dia: 2, rutina: rutinaPierna },
      { dia: 3, rutina: rutinaAccesorios },
      { dia: 4, rutina: rutinaTorso },
      { dia: 5, rutina: rutinaPierna },
      { dia: 7, rutina: rutinaTorso },
    ];

    // Limpiamos asignaciones de días no usados (Sábado 6)
    await prisma.usuarioRutina.updateMany({
      where: {
        idUsuario: usuario.id,
        idDiaSemana: { in: [6] },
      },
      data: { activa: false },
    });

    for (const item of asignacionesDias) {
      await prisma.usuarioRutina.upsert({
        where: {
          idUsuario_idRutina_idDiaSemana_fechaInicio: {
            idUsuario: usuario.id,
            idRutina: item.rutina.id,
            idDiaSemana: item.dia,
            fechaInicio,
          },
        },
        update: { activa: true, fechaFin: null, asignadaPorUsuario: entrenador.id },
        create: {
          idUsuario: usuario.id,
          idRutina: item.rutina.id,
          idDiaSemana: item.dia,
          fechaInicio,
          asignadaPorUsuario: entrenador.id,
        },
      });
    }

    // Sesión de demostración completada previa para métricas y gráficos
    const asignacionLunes = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaTorso.id, idDiaSemana: 1, activa: true },
    });

    if (asignacionLunes) {
      const fechaSesion = new Date();
      fechaSesion.setUTCDate(fechaSesion.getUTCDate() - 3);

      let sesion = await prisma.sesionEntrenamiento.findFirst({
        where: { idUsuario: usuario.id, notasAlumno: 'Sesión completada con éxito' },
      });

      if (!sesion) {
        const rutinaEjercicios = await prisma.rutinaEjercicio.findMany({
          where: { idRutina: rutinaTorso.id },
          orderBy: { orden: 'asc' },
        });

        sesion = await prisma.sesionEntrenamiento.create({
          data: {
            idUsuario: usuario.id,
            idUsuarioRutina: asignacionLunes.id,
            idRutina: rutinaTorso.id,
            fechaSesion,
            idEstado: 2, // completada
            duracionMinutos: 55,
            notasAlumno: 'Sesión completada con éxito',
            createdBy: usuario.id,
            sesionEjercicio: {
              create: rutinaEjercicios.map((re) => ({
                idRutinaEjercicio: re.id,
                idEjercicioEstandar: re.idEjercicioEstandar,
                idEjercicioPersonalizado: re.idEjercicioPersonalizado,
                orden: re.orden,
                sesionEjercicioSet: {
                  create: [1, 2, 3, 4].map((numeroSet) => ({
                    numeroSet,
                    repeticionesObjetivo: re.repeticiones,
                    pesoObjetivo: re.pesoObjetivo ? Number(re.pesoObjetivo) : 50,
                    repeticionesRealizadas: re.repeticiones,
                    pesoReal: re.pesoObjetivo ? Number(re.pesoObjetivo) : 50,
                    completado: true,
                  })),
                },
              })),
            },
          },
        });
      }

      const primerSet = await prisma.sesionEjercicioSet.findFirst({
        where: { sesionEjercicio: { idSesionEntrenamiento: sesion.id } },
      });

      if (primerSet) {
        // PR Estándar: Press de banca
        const ejBanca = ejerciciosMap.get('Press de banca');
        await prisma.alumnoEjercicioPr.upsert({
          where: {
            idUsuario_idEjercicioEstandar_peso: {
              idUsuario: usuario.id,
              idEjercicioEstandar: ejBanca.id,
              peso: 80,
            },
          },
          update: { repeticiones: 8, fechaPr: fechaSesion },
          create: {
            idUsuario: usuario.id,
            idEjercicioEstandar: ejBanca.id,
            peso: 80,
            repeticiones: 8,
            idSesionEjercicioSet: primerSet.id,
            fechaPr: fechaSesion,
          },
        });

        // PR Personalizado: Hip Thrust con barra para Sofía
        const hipThrust = personalizadosMap.get('Hip Thrust con barra');
        if (hipThrust && (a.nombre === 'Sofía' || a.nombre === 'Valentina')) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioPersonalizado_peso: {
                idUsuario: usuario.id,
                idEjercicioPersonalizado: hipThrust.id,
                peso: 120,
              },
            },
            update: { repeticiones: 10, fechaPr: fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioPersonalizado: hipThrust.id,
              peso: 120,
              repeticiones: 10,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: fechaSesion,
            },
          });
        }

        // PR Personalizado: Elevaciones laterales en polea para Ana y Diego
        const elevaciones = personalizadosMap.get('Elevaciones laterales en polea');
        if (elevaciones && (a.nombre === 'Ana' || a.nombre === 'Diego')) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioPersonalizado_peso: {
                idUsuario: usuario.id,
                idEjercicioPersonalizado: elevaciones.id,
                peso: 14,
              },
            },
            update: { repeticiones: 12, fechaPr: fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioPersonalizado: elevaciones.id,
              peso: 14,
              repeticiones: 12,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: fechaSesion,
            },
          });
        }
      }
    }
  }

  console.log('✅ Demo data lista y realista.');
  console.log('Entrenador: demo.entrenador@ritmo.app (Plan Básico Gratis: 4 alumnos, 3 rutinas)');
  console.log('Ejercicios personalizados creados: 4 (Hip Thrust, Elevaciones polea, Face pull, Paseo granjero)');
  console.log('Rutinas creadas: 3 (Torso, Pierna, Accesorios & Core con ejercicios personalizados)');
  console.log('Alumnos creados: 4 vinculados (Ana, Sofía, Diego, Carlos) + 1 independiente (Valentina con token demo VALE2026 / vale1234)');
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

async function asegurarSuscripcion(
  usuarioId: string,
  tipo: 'alumno' | 'entrenador',
  idPlan: number = 1,
) {
  const where = tipo === 'alumno' ? { alumnoId: usuarioId } : { entrenadorId: usuarioId };
  const suscripcion = await prisma.suscripcion.findFirst({ where });
  const planInfo =
    tipo === 'alumno'
      ? await prisma.planAlumno.findUnique({ where: { id: idPlan } })
      : await prisma.planEntrenador.findUnique({ where: { id: idPlan } });

  const esGratuito = idPlan === 1;
  const datos = {
    ...where,
    ...(tipo === 'alumno' ? { planAlumnoId: idPlan } : { planEntrenadorId: idPlan }),
    estado: EstadoSuscripcionEnum.activa,
    periodoActualInicio: new Date('2026-01-01T00:00:00.000Z'),
    periodoActualFin: esGratuito ? null : new Date('2027-01-01T00:00:00.000Z'),
    vitalicia: esGratuito,
    planNombreSnapshot: planInfo?.nombre || (esGratuito ? 'Basico' : 'Intermedio'),
    precioSnapshot: esGratuito ? 0 : Number(planInfo?.precio || 200.0),
    monedaSnapshot: 'MXN',
    duracionUnidadSnapshot: esGratuito ? null : ('mes' as any),
    duracionCantidadSnapshot: esGratuito ? null : 1,
  };

  if (suscripcion) {
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: datos,
    });
  } else {
    await prisma.suscripcion.create({
      data: datos,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
