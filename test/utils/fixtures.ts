import { randomUUID } from 'node:crypto';

import { emailUnico, hoy } from './db';

export const PASSWORD_E2E = 'Password123!';
export const ID_PLAN_GRATIS = 1;
export const ID_PLAN_DE_PAGO = 2;

export function loginPayload(correo: string, password = PASSWORD_E2E) {
  return { correo, password };
}

export function alumnoPayload(sobre: Record<string, unknown> = {}) {
  return {
    nombre: 'Ana',
    sexo: 'FEMENINO',
    apellido_paterno: 'Perez',
    apellido_materno: 'Lopez',
    correo: emailUnico('alumno'),
    password: PASSWORD_E2E,
    fecha_nacimiento: '1995-06-15',
    numero_celular: '+5215512345678',
    fecha_inicio_entrenamiento: '2024-01-10',
    id_objetivo: 1,
    id_nivel_actividad: 1,
    observaciones_medicas: 'Ninguna',
    lesiones_actuales: 'Ninguna',
    lesiones_pasadas: 'Ninguna',
    contacto_emergencia_nombre: 'Maria Lopez',
    contacto_emergencia_telefono: '+5215500000000',
    ...sobre,
  };
}

export function entrenadorPayload(sobre: Record<string, unknown> = {}) {
  return {
    nombre: 'Carlos',
    sexo: 'MASCULINO',
    apellido_paterno: 'Garcia',
    apellido_materno: 'Ruiz',
    correo: emailUnico('entrenador'),
    password: PASSWORD_E2E,
    fecha_nacimiento: '1990-03-10',
    nombre_publico: 'Carlos Coach',
    fecha_entrenador: '2023-01-15',
    ...sobre,
  };
}

export function rutinaPayload(sobre: Record<string, unknown> = {}) {
  return {
    nombre: `Rutina e2e ${randomUUID().slice(0, 8)}`,
    descripcion: 'Rutina de prueba generada por los tests e2e.',
    id_categoria_rutina: 1,
    ...sobre,
  };
}

export function ejercicioPayload(sobre: Record<string, unknown> = {}) {
  return {
    nombre: `Prensa e2e ${randomUUID().slice(0, 8)}`,
    descripcion: 'Ejercicio de cuadriceps generado por los tests e2e.',
    url_imagen: `https://ejemplo.com/${randomUUID().slice(0, 8)}.jpg`,
    link_informacion: `https://ejemplo.com/${randomUUID().slice(0, 8)}`,
    musculos: [1],
    equipos: [1],
    ...sobre,
  };
}

export function rutinaEjerciciosPayload(
  opciones: {
    idEstandar?: string | number | bigint;
    idPersonalizado?: string | number | bigint;
  } = {},
  sobre: Record<string, unknown> = {},
) {
  const referencia: Record<string, unknown> = {};

  if (opciones.idEstandar !== undefined) {
    referencia.id_ejercicio_estandar = String(opciones.idEstandar);
  }
  if (opciones.idPersonalizado !== undefined) {
    referencia.id_ejercicio_personalizado = String(opciones.idPersonalizado);
  }

  return {
    ejercicios: [
      {
        ...referencia,
        orden: 1,
        series: 3,
        repeticiones: 12,
        peso_objetivo: 10,
      },
    ],
    ...sobre,
  };
}

export function asignarRutinaPayload(idAlumno: string, sobre: Record<string, unknown> = {}) {
  return {
    id_alumno: idAlumno,
    numero_dia: 1,
    fecha_inicio: hoy(),
    ...sobre,
  };
}

export function cambiarPlanPayload(
  idPlanNuevo: number,
  modoCambio: 'instantaneo' | 'finalPeriodo' = 'instantaneo',
) {
  return { idPlanNuevo, modoCambio };
}

export function consumirTokenPayload(codigo: string, secreto: string) {
  return { codigo, secreto };
}

export function checkoutPayload(pagoId: string | bigint, suscripcionId: string | bigint) {
  return {
    pagoId: String(pagoId),
    suscripcionId: String(suscripcionId),
  };
}

export function cancelarMiEntrenadorPayload() {
  return { contraseña_alumno: PASSWORD_E2E };
}

export function cancelarAlumnoPayload() {
  return { contraseña_entrenador: PASSWORD_E2E };
}
