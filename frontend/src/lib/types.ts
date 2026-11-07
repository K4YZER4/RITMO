export type Profile = {
  id: string;
  role: 'entrenador' | 'alumno' | 'alumnoConEntrenador';
  nombre: string;
  apellidoPaterno: string;
  correo: string;
  alumno?: { objetivo?: { nombre: string }; entrenadorActual?: { nombrePublico: string } };
  entrenador?: { nombrePublico: string; plan: { nombre: string } };
};
export type Routine = {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  _count?: { rutinaEjercicio: number; usuarioRutina: number };
  categoriaRutina?: { id: number; nombre: string };
  rutinaEjercicio?: Array<{
    id: string;
    orden: number;
    series: number;
    repeticiones: number;
    ejercicioEstandar?: { id: string; nombre: string };
    ejercicioPersonalizado?: { id: string; nombre: string };
    pesoObjetivo?: string;
    notaEntrenador?: string;
  }>;
};
export type Catalogs = {
  categoriasRutina: Array<{ id: number; nombre: string; descripcion?: string }>;
  musculos: Array<{ id: string; nombre: string }>;
  equipos: Array<{ id: string; nombre: string }>;
  objetivos: Array<{ id: number; nombre: string }>;
  nivelesActividad: Array<{ id: number; nombre: string }>;
};
export type ExerciseLibrary = {
  estandar: Array<{ id: string; nombre: string; descripcion?: string }>;
  personalizados: Array<{ id: string; nombre: string; descripcion?: string }>;
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
