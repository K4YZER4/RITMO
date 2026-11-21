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
    update: { nombrePublico: 'Mateo Coach', idPlan: 2 },
    create: {
      idUsuario: entrenador.id,
      slug: 'mateo-coach-demo',
      nombrePublico: 'Mateo Coach',
      fechaEntrenador: new Date('2020-01-01'),
      idPlan: 2,
    },
  });
  await asegurarSuscripcion(entrenador.id, 'entrenador', 2);

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

    // Mediciones periódicas realistas (historial de 8 semanas para graficar evolución continua)
    const historialMedicionesPorAlumno: Record<string, Array<{ diasAtras: number; peso: number; grasa: number }>> = {
      Ana: [
        { diasAtras: 56, peso: 66.8, grasa: 23.8 },
        { diasAtras: 49, peso: 66.4, grasa: 23.4 },
        { diasAtras: 42, peso: 66.0, grasa: 23.1 },
        { diasAtras: 35, peso: 65.6, grasa: 22.7 },
        { diasAtras: 28, peso: 65.2, grasa: 22.3 },
        { diasAtras: 21, peso: 64.9, grasa: 21.9 },
        { diasAtras: 14, peso: 64.7, grasa: 21.5 },
        { diasAtras: 7,  peso: 64.6, grasa: 21.2 },
        { diasAtras: 1,  peso: 64.5, grasa: 21.0 },
      ],
      Sofía: [
        { diasAtras: 56, peso: 56.2, grasa: 24.5 },
        { diasAtras: 49, peso: 56.5, grasa: 24.2 },
        { diasAtras: 42, peso: 56.9, grasa: 24.0 },
        { diasAtras: 35, peso: 57.2, grasa: 23.7 },
        { diasAtras: 28, peso: 57.4, grasa: 23.5 },
        { diasAtras: 21, peso: 57.6, grasa: 23.4 },
        { diasAtras: 14, peso: 57.8, grasa: 23.2 },
        { diasAtras: 7,  peso: 57.9, grasa: 23.1 },
        { diasAtras: 1,  peso: 58.0, grasa: 23.0 },
      ],
      Diego: [
        { diasAtras: 56, peso: 86.5, grasa: 21.5 },
        { diasAtras: 49, peso: 85.8, grasa: 21.0 },
        { diasAtras: 42, peso: 85.1, grasa: 20.4 },
        { diasAtras: 35, peso: 84.5, grasa: 19.8 },
        { diasAtras: 28, peso: 83.9, grasa: 19.3 },
        { diasAtras: 21, peso: 83.4, grasa: 18.8 },
        { diasAtras: 14, peso: 83.0, grasa: 18.4 },
        { diasAtras: 7,  peso: 82.7, grasa: 18.2 },
        { diasAtras: 1,  peso: 82.5, grasa: 18.0 },
      ],
      Carlos: [
        { diasAtras: 56, peso: 73.2, grasa: 16.2 },
        { diasAtras: 49, peso: 73.7, grasa: 16.0 },
        { diasAtras: 42, peso: 74.2, grasa: 15.8 },
        { diasAtras: 35, peso: 74.6, grasa: 15.6 },
        { diasAtras: 28, peso: 75.1, grasa: 15.4 },
        { diasAtras: 21, peso: 75.4, grasa: 15.3 },
        { diasAtras: 14, peso: 75.7, grasa: 15.1 },
        { diasAtras: 7,  peso: 75.9, grasa: 15.0 },
        { diasAtras: 1,  peso: 76.0, grasa: 15.0 },
      ],
      Valentina: [
        { diasAtras: 56, peso: 63.0, grasa: 26.5 },
        { diasAtras: 49, peso: 62.6, grasa: 26.2 },
        { diasAtras: 42, peso: 62.3, grasa: 25.9 },
        { diasAtras: 35, peso: 62.0, grasa: 25.6 },
        { diasAtras: 28, peso: 61.7, grasa: 25.4 },
        { diasAtras: 21, peso: 61.5, grasa: 25.2 },
        { diasAtras: 14, peso: 61.4, grasa: 25.1 },
        { diasAtras: 7,  peso: 61.3, grasa: 25.0 },
        { diasAtras: 1,  peso: 61.2, grasa: 25.0 },
      ],
    };

    const medicionesAlumno = historialMedicionesPorAlumno[a.nombre] || [
      { diasAtras: 1, peso: a.pesoKg, grasa: a.grasaPct },
    ];

    for (const med of medicionesAlumno) {
      const fechaMed = new Date();
      fechaMed.setUTCDate(fechaMed.getUTCDate() - med.diasAtras);
      fechaMed.setUTCHours(0, 0, 0, 0);

      await prisma.usuarioMedicion.upsert({
        where: {
          idUsuario_fechaMedicion: {
            idUsuario: usuario.id,
            fechaMedicion: fechaMed,
          },
        },
        update: { pesoKg: med.peso, grasaCorporalPct: med.grasa },
        create: {
          idUsuario: usuario.id,
          fechaMedicion: fechaMed,
          pesoKg: med.peso,
          grasaCorporalPct: med.grasa,
        },
      });
    }

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

    // Sesiones de demostración completadas previas para métricas, gráficos y feedback
    const asignacionLunes = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaTorso.id, idDiaSemana: 1, activa: true },
    });
    const asignacionMartes = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaPierna.id, idDiaSemana: 2, activa: true },
    });
    const asignacionMiercoles = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaAccesorios.id, idDiaSemana: 3, activa: true },
    });
    const asignacionJueves = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaTorso.id, idDiaSemana: 4, activa: true },
    });
    const asignacionViernes = await prisma.usuarioRutina.findFirst({
      where: { idUsuario: usuario.id, idRutina: rutinaPierna.id, idDiaSemana: 5, activa: true },
    });

    if (asignacionLunes) {
      const rutinaEjerciciosTorso = await prisma.rutinaEjercicio.findMany({
        where: { idRutina: rutinaTorso.id },
        orderBy: { orden: 'asc' },
      });
      const rutinaEjerciciosPierna = await prisma.rutinaEjercicio.findMany({
        where: { idRutina: rutinaPierna.id },
        orderBy: { orden: 'asc' },
      });
      const rutinaEjerciciosAccesorios = await prisma.rutinaEjercicio.findMany({
        where: { idRutina: rutinaAccesorios.id },
        orderBy: { orden: 'asc' },
      });

      // 1. Sesión reciente de Torso (hace 2 días) con notas de molestia en hombro
      const fechaSesionTorso = new Date();
      fechaSesionTorso.setUTCDate(fechaSesionTorso.getUTCDate() - 2);

      let sesion = await prisma.sesionEntrenamiento.findFirst({
        where: { idUsuario: usuario.id, idRutina: rutinaTorso.id, duracionMinutos: 52 },
      });

      if (!sesion) {
        sesion = await prisma.sesionEntrenamiento.create({
          data: {
            idUsuario: usuario.id,
            idUsuarioRutina: asignacionLunes.id,
            idRutina: rutinaTorso.id,
            fechaSesion: fechaSesionTorso,
            idEstado: 2, // completada
            duracionMinutos: 52,
            notasAlumno:
              a.nombre === 'Ana'
                ? 'Completé todo el entrenamiento. Sentí una punzada incómoda en la parte anterior del hombro derecho en la última serie pesada de press de banca con 72.5kg. Avísame si cambiamos agarre o bajamos carga.'
                : 'Sesión completada con excelente intensidad y técnica sólida.',
            notasEntrenador:
              a.nombre === 'Ana'
                ? 'Enterado Ana. Para la próxima sesión cambiamos el press de banca a mancuernas con agarre neutro a 30° para no comprometer el manguito rotador.'
                : null,
            createdBy: usuario.id,
            sesionEjercicio: {
              create: rutinaEjerciciosTorso.map((re) => {
                const ejBanca = ejerciciosMap.get('Press de banca');
                const esPressBanca = re.idEjercicioEstandar === ejBanca?.id;
                const elevaciones = personalizadosMap.get('Elevaciones laterales en polea');
                const esElevaciones = re.idEjercicioPersonalizado === elevaciones?.id;

                let notaEjercicio: string | null = null;
                if (a.nombre === 'Ana' && esPressBanca) {
                  notaEjercicio = 'Molestia leve en hombro derecho al descender con 72.5kg (4ta serie, RIR 1).';
                } else if (a.nombre === 'Ana' && esElevaciones) {
                  notaEjercicio = 'Excelente aislamiento del deltoides lateral sin impacto en la articulación.';
                }

                return {
                  idRutinaEjercicio: re.id,
                  idEjercicioEstandar: re.idEjercicioEstandar,
                  idEjercicioPersonalizado: re.idEjercicioPersonalizado,
                  orden: re.orden,
                  nota: notaEjercicio,
                  sesionEjercicioSet: {
                    create: [1, 2, 3, 4].map((numeroSet) => {
                      const peso = esPressBanca
                        ? [60, 65, 70, 72.5][numeroSet - 1]
                        : re.pesoObjetivo
                          ? Number(re.pesoObjetivo)
                          : 45;
                      const reps = esPressBanca
                        ? [10, 10, 8, 6][numeroSet - 1]
                        : re.repeticiones;
                      const rpe = esPressBanca
                        ? [7, 8, 8.5, 9.5][numeroSet - 1]
                        : 8;

                      return {
                        numeroSet,
                        repeticionesObjetivo: re.repeticiones,
                        pesoObjetivo: peso,
                        repeticionesRealizadas: reps,
                        pesoReal: peso,
                        rpe,
                        rir: rpe >= 9 ? 1 : 2,
                        completado: true,
                      };
                    }),
                  },
                };
              }),
            },
          },
        });
      }

      // 2. Sesión anterior de Pierna (hace 5 días)
      if (asignacionMartes) {
        const fechaSesionPierna = new Date();
        fechaSesionPierna.setUTCDate(fechaSesionPierna.getUTCDate() - 5);

        const sesionPiernaExistente = await prisma.sesionEntrenamiento.findFirst({
          where: { idUsuario: usuario.id, idRutina: rutinaPierna.id, duracionMinutos: 58 },
        });

        if (!sesionPiernaExistente) {
          await prisma.sesionEntrenamiento.create({
            data: {
              idUsuario: usuario.id,
              idUsuarioRutina: asignacionMartes.id,
              idRutina: rutinaPierna.id,
              fechaSesion: fechaSesionPierna,
              idEstado: 2,
              duracionMinutos: 58,
              notasAlumno:
                a.nombre === 'Ana'
                  ? 'Gran sesión de pierna. Me sentí fuerte en sentadilla libre y aumenté 5kg sin perder profundidad.'
                  : a.nombre === 'Sofía'
                    ? 'El Hip Thrust con barra se sintió increíble con 120kg. Cuidé la muñeca en las extensiones y no hubo dolor.'
                    : 'Entrenamiento de pierna intenso y completo.',
              createdBy: usuario.id,
              sesionEjercicio: {
                create: rutinaEjerciciosPierna.map((re) => {
                  const hipThrust = personalizadosMap.get('Hip Thrust con barra');
                  const esHipThrust = re.idEjercicioPersonalizado === hipThrust?.id;
                  return {
                    idRutinaEjercicio: re.id,
                    idEjercicioEstandar: re.idEjercicioEstandar,
                    idEjercicioPersonalizado: re.idEjercicioPersonalizado,
                    orden: re.orden,
                    nota: esHipThrust ? 'Activación brutal de glúteo superior, pausa de 1 segundo arriba.' : null,
                    sesionEjercicioSet: {
                      create: [1, 2, 3, 4].map((numeroSet) => ({
                        numeroSet,
                        repeticionesObjetivo: re.repeticiones,
                        pesoObjetivo: esHipThrust ? 120 : re.pesoObjetivo ? Number(re.pesoObjetivo) : 70,
                        repeticionesRealizadas: re.repeticiones,
                        pesoReal: esHipThrust ? 120 : re.pesoObjetivo ? Number(re.pesoObjetivo) : 70,
                        rpe: 8.5,
                        completado: true,
                      })),
                    },
                  };
                }),
              },
            },
          });
        }
      }

      // 3. Sesiones históricas en los últimos 30 días para enriquecer el historial de entrenamientos, volumen y métricas
      const sesionesAdicionales = [
        {
          diasAtras: 7,
          duracion: 46,
          asig: asignacionMiercoles,
          rutina: rutinaAccesorios,
          ejercicios: rutinaEjerciciosAccesorios,
          nota: 'Excelente aislamiento en hombros y glúteo. El Hip Thrust en accesorios se sintió con buena congestión.',
          notaCoach: 'Buena técnica, mantén esa cadencia controlada.',
        },
        {
          diasAtras: 9,
          duracion: 54,
          asig: asignacionJueves,
          rutina: rutinaTorso,
          ejercicios: rutinaEjerciciosTorso,
          nota: 'Press de banca con técnica impecable y buena retracción escapular.',
          notaCoach: 'Sólido movimiento en banca.',
        },
        {
          diasAtras: 12,
          duracion: 59,
          asig: asignacionViernes,
          rutina: rutinaPierna,
          ejercicios: rutinaEjerciciosPierna,
          nota: 'Sentadilla pesada con 95kg, muy buena profundidad sin molestias.',
          notaCoach: 'Gran progreso en fuerza de pierna Ana.',
        },
        {
          diasAtras: 14,
          duracion: 48,
          asig: asignacionMiercoles,
          rutina: rutinaAccesorios,
          ejercicios: rutinaEjerciciosAccesorios,
          nota: 'Sesión de core y hombros completada con gran intensidad.',
          notaCoach: null,
        },
        {
          diasAtras: 16,
          duracion: 51,
          asig: asignacionLunes,
          rutina: rutinaTorso,
          ejercicios: rutinaEjerciciosTorso,
          nota: 'Remo con barra y jalón al pecho con peso máximo récord.',
          notaCoach: 'Felicidades por esa marca en jalón.',
        },
        {
          diasAtras: 19,
          duracion: 57,
          asig: asignacionMartes,
          rutina: rutinaPierna,
          ejercicios: rutinaEjerciciosPierna,
          nota: 'Prensa de piernas y peso muerto rumano con cadencia lenta en excéntrica.',
          notaCoach: null,
        },
        {
          diasAtras: 21,
          duracion: 45,
          asig: asignacionMiercoles,
          rutina: rutinaAccesorios,
          ejercicios: rutinaEjerciciosAccesorios,
          nota: 'Face pulls y elevaciones laterales en polea con máxima contracción.',
          notaCoach: null,
        },
        {
          diasAtras: 24,
          duracion: 53,
          asig: asignacionJueves,
          rutina: rutinaTorso,
          ejercicios: rutinaEjerciciosTorso,
          nota: 'Press militar estricto y fondos con excelente estabilidad.',
          notaCoach: null,
        },
        {
          diasAtras: 26,
          duracion: 56,
          asig: asignacionViernes,
          rutina: rutinaPierna,
          ejercicios: rutinaEjerciciosPierna,
          nota: 'Inicio del ciclo de fuerza en básicos de pierna.',
          notaCoach: 'Muy bien ejecutado.',
        },
        {
          diasAtras: 28,
          duracion: 47,
          asig: asignacionMiercoles,
          rutina: rutinaAccesorios,
          ejercicios: rutinaEjerciciosAccesorios,
          nota: 'Trabajo complementario de estabilidad lumbar y hombro posterior.',
          notaCoach: null,
        },
      ];

      for (const s of sesionesAdicionales) {
        if (!s.asig) continue;
        const fecha = new Date();
        fecha.setUTCDate(fecha.getUTCDate() - s.diasAtras);

        const sesionExiste = await prisma.sesionEntrenamiento.findFirst({
          where: { idUsuario: usuario.id, duracionMinutos: s.duracion },
        });

        if (!sesionExiste) {
          await prisma.sesionEntrenamiento.create({
            data: {
              idUsuario: usuario.id,
              idUsuarioRutina: s.asig.id,
              idRutina: s.rutina.id,
              fechaSesion: fecha,
              idEstado: 2, // completada
              duracionMinutos: s.duracion,
              notasAlumno: s.nota,
              notasEntrenador: s.notaCoach,
              createdBy: usuario.id,
              sesionEjercicio: {
                create: s.ejercicios.map((re) => ({
                  idRutinaEjercicio: re.id,
                  idEjercicioEstandar: re.idEjercicioEstandar,
                  idEjercicioPersonalizado: re.idEjercicioPersonalizado,
                  orden: re.orden,
                  sesionEjercicioSet: {
                    create: [1, 2, 3, 4].map((numeroSet) => {
                      const peso = re.pesoObjetivo ? Number(re.pesoObjetivo) : 50;
                      return {
                        numeroSet,
                        repeticionesObjetivo: re.repeticiones,
                        pesoObjetivo: peso,
                        repeticionesRealizadas: re.repeticiones,
                        pesoReal: peso,
                        rpe: 8,
                        completado: true,
                      };
                    }),
                  },
                })),
              },
            },
          });
        }
      }

      const primerSet = await prisma.sesionEjercicioSet.findFirst({
        where: { sesionEjercicio: { idSesionEntrenamiento: sesion.id } },
      });

      if (primerSet) {
        // PR Estándar: Press de banca
        const ejBanca = ejerciciosMap.get('Press de banca');
        if (ejBanca) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioEstandar_peso: {
                idUsuario: usuario.id,
                idEjercicioEstandar: ejBanca.id,
                peso: 80,
              },
            },
            update: { repeticiones: 8, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioEstandar: ejBanca.id,
              peso: 80,
              repeticiones: 8,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
            },
          });
        }

        // PR Estándar: Sentadilla con barra
        const ejSentadilla = ejerciciosMap.get('Sentadilla con barra');
        if (ejSentadilla) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioEstandar_peso: {
                idUsuario: usuario.id,
                idEjercicioEstandar: ejSentadilla.id,
                peso: 105,
              },
            },
            update: { repeticiones: 6, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioEstandar: ejSentadilla.id,
              peso: 105,
              repeticiones: 6,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
            },
          });
        }

        // PR Estándar: Remo con barra
        const ejRemo = ejerciciosMap.get('Remo con barra');
        if (ejRemo) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioEstandar_peso: {
                idUsuario: usuario.id,
                idEjercicioEstandar: ejRemo.id,
                peso: 75,
              },
            },
            update: { repeticiones: 8, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioEstandar: ejRemo.id,
              peso: 75,
              repeticiones: 8,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
            },
          });
        }

        // PR Estándar: Peso muerto rumano
        const ejPesoMuerto = ejerciciosMap.get('Peso muerto rumano');
        if (ejPesoMuerto) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioEstandar_peso: {
                idUsuario: usuario.id,
                idEjercicioEstandar: ejPesoMuerto.id,
                peso: 100,
              },
            },
            update: { repeticiones: 8, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioEstandar: ejPesoMuerto.id,
              peso: 100,
              repeticiones: 8,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
            },
          });
        }

        // PR Personalizado: Hip Thrust con barra para Sofía, Ana y Valentina
        const hipThrust = personalizadosMap.get('Hip Thrust con barra');
        if (hipThrust && (a.nombre === 'Sofía' || a.nombre === 'Ana' || a.nombre === 'Valentina')) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioPersonalizado_peso: {
                idUsuario: usuario.id,
                idEjercicioPersonalizado: hipThrust.id,
                peso: 120,
              },
            },
            update: { repeticiones: 10, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioPersonalizado: hipThrust.id,
              peso: 120,
              repeticiones: 10,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
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
            update: { repeticiones: 12, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioPersonalizado: elevaciones.id,
              peso: 14,
              repeticiones: 12,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
            },
          });
        }

        // PR Personalizado: Face Pull con cuerda en polea
        const facePull = personalizadosMap.get('Face Pull con cuerda en polea');
        if (facePull) {
          await prisma.alumnoEjercicioPr.upsert({
            where: {
              idUsuario_idEjercicioPersonalizado_peso: {
                idUsuario: usuario.id,
                idEjercicioPersonalizado: facePull.id,
                peso: 30,
              },
            },
            update: { repeticiones: 15, fechaPr: sesion.fechaSesion },
            create: {
              idUsuario: usuario.id,
              idEjercicioPersonalizado: facePull.id,
              peso: 30,
              repeticiones: 15,
              idSesionEjercicioSet: primerSet.id,
              fechaPr: sesion.fechaSesion,
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
  // Find currently active subscription first to avoid violating unique active index
  let suscripcion = await prisma.suscripcion.findFirst({
    where: { ...where, estado: EstadoSuscripcionEnum.activa },
  });
  if (!suscripcion) {
    suscripcion = await prisma.suscripcion.findFirst({ where });
  }
  const planInfo =
    tipo === 'alumno'
      ? await prisma.planAlumno.findUnique({ where: { id: idPlan } })
      : await prisma.planEntrenador.findUnique({ where: { id: idPlan } });

  const esGratuito = idPlan === 1;
  const finPeriodo = new Date();
  finPeriodo.setUTCDate(finPeriodo.getUTCDate() + 30);

  const datos = {
    ...where,
    ...(tipo === 'alumno' ? { planAlumnoId: idPlan } : { planEntrenadorId: idPlan }),
    estado: EstadoSuscripcionEnum.activa,
    periodoActualInicio: new Date(),
    periodoActualFin: esGratuito ? null : finPeriodo,
    siguienteCobroEn: esGratuito ? null : finPeriodo,
    vitalicia: esGratuito,
    cancelarAlFinalDelPeriodo: false,
    canceladaEn: null,
    proveedor: esGratuito ? null : ('stripe' as any),
    proveedorSubscriptionId: esGratuito ? null : `sub_demo_${tipo}_${idPlan}`,
    proveedorCustomerId: `cus_demo_${usuarioId.slice(0, 8)}`,
    proveedorPrecioIdSnapshot: planInfo?.proveedorPrecioId || null,
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
