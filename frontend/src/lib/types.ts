export type Profile = {
  id: string;
  role: 'entrenador' | 'alumno' | 'alumnoConEntrenador';
  nombre: string;
  apellidoPaterno: string;
  correo: string;
  alumno?: {
    objetivo?: { nombre: string };
    entrenadorActual?: {
      nombrePublico: string;
      usuario?: { nombre: string; apellidoPaterno: string };
    };
  };
  entrenador?: { nombrePublico: string; plan: { nombre: string } };
};
export type Routine = {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  _count?: { rutinaEjercicio: number; usuarioRutina: number };
  categoriaRutina?: { id: number; nombre: string };
  usuarioRutina?: Array<{
    id: string;
    idDiaSemana: number;
    activa: boolean;
    usuario: { id: string; nombre: string; apellidoPaterno: string };
    diaSemana: { nombre: string };
  }>;
  rutinaEjercicio?: Array<{
    id: string;
    orden: number;
    series: number;
    repeticiones: number;
    ejercicioEstandar?: { id: string; nombre: string };
    ejercicioPersonalizado?: { id: string; nombre: string };
    pesoObjetivo?: string;
    notaEntrenador?: string;
    linkApoyo?: string;
  }>;
};
export type Catalogs = {
  categoriasRutina: Array<{ id: number; nombre: string; descripcion?: string }>;
  musculos: Array<{ id: string; nombre: string }>;
  equipos: Array<{ id: string; nombre: string }>;
  objetivos: Array<{ id: number; nombre: string }>;
  nivelesActividad: Array<{ id: number; nombre: string }>;
  planesAlumno: Plan[];
  planesEntrenador: Plan[];
};
export type Plan = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: string;
  moneda: string;
  esGratuito: boolean;
  esVitalicio: boolean;
  limiteEjerciciosPersonalizados?: number;
  limiteRutinas?: number;
  limiteAlumnos?: number;
};
export type ExerciseLibrary = {
  estandar: Array<ExerciseLibraryItem>;
  personalizados: Array<ExerciseLibraryItem>;
};
export type ExerciseLibraryItem = {
  id: string;
  nombre: string;
  descripcion?: string;
  urlImagen?: string;
  linkInformacion?: string;
  activa?: boolean;
  ejercicioEstandarMusculo?: Array<{ musculo: { id: string; nombre: string } }>;
  ejercicioEstandarEquipo?: Array<{ equipo: { id: string; nombre: string } }>;
  ejercicioPersonalizadoMusculo?: Array<{ musculo: { id: string; nombre: string } }>;
  ejercicioPersonalizadoEquipo?: Array<{ equipo: { id: string; nombre: string } }>;
  rutinaEjercicio?: Array<{
    id: string;
    idRutina: string;
    orden: number;
    series: number;
    repeticiones: number;
    pesoObjetivo?: string;
    notaEntrenador?: string;
    linkApoyo?: string;
    rutina: { id: string; nombre: string; activa: boolean };
  }>;
};
export type Student = {
  idUsuario: string;
  usuario: {
    nombre: string;
    apellidoPaterno: string;
    correo: string;
    _count: { usuarioRutina: number; sesionEntrenamiento: number };
    usuarioMedicion: Array<{ pesoKg: string }>;
  };
  objetivo?: { nombre: string };
};
export type Assignment = {
  id: string;
  idDiaSemana?: number;
  fechaProgramada?: string;
  estadoSemana?: 'disponible' | 'pendiente' | 'en_curso' | 'completada';
  rutina: { id: string; nombre: string; descripcion?: string; rutinaEjercicio: Array<unknown> };
  sesionEntrenamiento: Array<{ id: string; idEstado: number }>;
};
export type Session = {
  id: string;
  idEstado: number;
  rutina: { nombre: string };
  sesionEjercicio: Array<{
    id: string;
    ejercicioEstandar?: { nombre: string };
    ejercicioPersonalizado?: { nombre: string };
    sesionEjercicioSet: Array<{
      id: string;
      numeroSet: number;
      repeticionesObjetivo: number;
      pesoObjetivo?: string;
      repeticionesRealizadas?: number;
      pesoReal?: string;
      completado: boolean;
    }>;
  }>;
};
