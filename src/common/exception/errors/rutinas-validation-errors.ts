import { validationMessage } from '../validation-message';

export const RUTINAS_VALIDATION_ERRORS = {
  REQUIRED_ALUMNO_ID: validationMessage('REQUIRED_ALUMNO_ID', 'El id del alumno es obligatorio.'),
  INVALID_ALUMNO_ID: validationMessage(
    'INVALID_ALUMNO_ID',
    'El id del alumno debe ser un UUID válido.',
  ),

  REQUIRED_NUMERO_DIA: validationMessage('REQUIRED_NUMERO_DIA', 'El número de día es obligatorio.'),
  INVALID_NUMERO_DIA: validationMessage(
    'INVALID_NUMERO_DIA',
    'El número de día debe ser un entero.',
  ),
  NUMERO_DIA_TOO_LOW: validationMessage(
    'NUMERO_DIA_TOO_LOW',
    'El número de día debe ser mayor o igual a 1.',
  ),
  NUMERO_DIA_TOO_HIGH: validationMessage(
    'NUMERO_DIA_TOO_HIGH',
    'El número de día debe ser menor o igual a 7.',
  ),

  REQUIRED_ASIGNADA_POR_USUARIO: validationMessage(
    'REQUIRED_ASIGNADA_POR_USUARIO',
    'El id del usuario que asigna la rutina es obligatorio.',
  ),
  INVALID_ASIGNADA_POR_USUARIO: validationMessage(
    'INVALID_ASIGNADA_POR_USUARIO',
    'El id del usuario que asigna la rutina debe ser un UUID válido.',
  ),

  REQUIRED_FECHA_INICIO: validationMessage(
    'REQUIRED_FECHA_INICIO',
    'La fecha de inicio es obligatoria.',
  ),
  INVALID_FECHA_INICIO: validationMessage(
    'INVALID_FECHA_INICIO',
    'La fecha de inicio debe tener un formato válido.',
  ),
  FECHA_INICIO_NOT_TODAY_OR_FUTURE: validationMessage(
    'FECHA_INICIO_NOT_TODAY_OR_FUTURE',
    'La fecha de inicio debe ser mayor o igual a la fecha actual.',
  ),

  INVALID_FECHA_FIN: validationMessage(
    'INVALID_FECHA_FIN',
    'La fecha de fin debe tener un formato válido.',
  ),
  FECHA_FIN_BEFORE_FECHA_INICIO: validationMessage(
    'FECHA_FIN_BEFORE_FECHA_INICIO',
    'La fecha de fin debe ser mayor o igual a la fecha de inicio.',
  ),

  REQUIRED_CREATED_BY_USUARIO: validationMessage(
    'REQUIRED_CREATED_BY_USUARIO',
    'created_by_usuario es obligatorio.',
  ),
  INVALID_CREATED_BY_USUARIO: validationMessage(
    'INVALID_CREATED_BY_USUARIO',
    'created_by_usuario debe ser un UUID válido.',
  ),

  REQUIRED_RUTINA_NOMBRE: validationMessage('REQUIRED_RUTINA_NOMBRE', 'El nombre es obligatorio.'),
  INVALID_RUTINA_NOMBRE: validationMessage('INVALID_RUTINA_NOMBRE', 'El nombre debe ser texto.'),
  RUTINA_NOMBRE_TOO_LONG: validationMessage(
    'RUTINA_NOMBRE_TOO_LONG',
    'El nombre no puede exceder 100 caracteres.',
  ),

  REQUIRED_RUTINA_DESCRIPCION: validationMessage(
    'REQUIRED_RUTINA_DESCRIPCION',
    'La descripción es obligatoria.',
  ),
  INVALID_RUTINA_DESCRIPCION: validationMessage(
    'INVALID_RUTINA_DESCRIPCION',
    'La descripción debe ser texto.',
  ),
  RUTINA_DESCRIPCION_TOO_LONG: validationMessage(
    'RUTINA_DESCRIPCION_TOO_LONG',
    'La descripción no puede exceder 1000 caracteres.',
  ),

  REQUIRED_CATEGORIA_RUTINA_ID: validationMessage(
    'REQUIRED_CATEGORIA_RUTINA_ID',
    'id_categoria_rutina es obligatorio.',
  ),
  INVALID_CATEGORIA_RUTINA_ID: validationMessage(
    'INVALID_CATEGORIA_RUTINA_ID',
    'id_categoria_rutina debe ser un entero.',
  ),
  CATEGORIA_RUTINA_ID_TOO_LOW: validationMessage(
    'CATEGORIA_RUTINA_ID_TOO_LOW',
    'id_categoria_rutina debe ser mayor a 0.',
  ),

  REQUIRED_EJERCICIOS: validationMessage('REQUIRED_EJERCICIOS', 'ejercicios es obligatorio.'),
  INVALID_EJERCICIOS: validationMessage('INVALID_EJERCICIOS', 'ejercicios debe ser un arreglo.'),
  EJERCICIOS_MIN_SIZE: validationMessage(
    'EJERCICIOS_MIN_SIZE',
    'ejercicios debe contener al menos un ejercicio.',
  ),

  INVALID_ID_EJERCICIO_ESTANDAR: validationMessage(
    'INVALID_ID_EJERCICIO_ESTANDAR',
    'id_ejercicio_estandar debe ser un entero.',
  ),
  ID_EJERCICIO_ESTANDAR_TOO_LOW: validationMessage(
    'ID_EJERCICIO_ESTANDAR_TOO_LOW',
    'id_ejercicio_estandar debe ser mayor a 0.',
  ),

  INVALID_ID_EJERCICIO_PERSONALIZADO: validationMessage(
    'INVALID_ID_EJERCICIO_PERSONALIZADO',
    'id_ejercicio_personalizado debe ser un entero.',
  ),
  ID_EJERCICIO_PERSONALIZADO_TOO_LOW: validationMessage(
    'ID_EJERCICIO_PERSONALIZADO_TOO_LOW',
    'id_ejercicio_personalizado debe ser mayor a 0.',
  ),

  REQUIRED_ORDEN: validationMessage('REQUIRED_ORDEN', 'orden es obligatorio.'),
  INVALID_ORDEN: validationMessage('INVALID_ORDEN', 'orden debe ser un entero.'),
  ORDEN_TOO_LOW: validationMessage('ORDEN_TOO_LOW', 'orden debe ser mayor a 0.'),

  REQUIRED_SERIES: validationMessage('REQUIRED_SERIES', 'series es obligatorio.'),
  INVALID_SERIES: validationMessage('INVALID_SERIES', 'series debe ser un entero.'),
  SERIES_TOO_LOW: validationMessage('SERIES_TOO_LOW', 'series debe ser mayor a 0.'),

  REQUIRED_REPETICIONES: validationMessage('REQUIRED_REPETICIONES', 'repeticiones es obligatorio.'),
  INVALID_REPETICIONES: validationMessage(
    'INVALID_REPETICIONES',
    'repeticiones debe ser un entero.',
  ),
  REPETICIONES_TOO_LOW: validationMessage(
    'REPETICIONES_TOO_LOW',
    'repeticiones debe ser mayor a 0.',
  ),

  INVALID_PESO_OBJETIVO: validationMessage(
    'INVALID_PESO_OBJETIVO',
    'peso_objetivo debe ser un número válido con máximo 2 decimales.',
  ),
  PESO_OBJETIVO_TOO_LOW: validationMessage(
    'PESO_OBJETIVO_TOO_LOW',
    'peso_objetivo no puede ser negativo.',
  ),

  INVALID_NOTA_ENTRENADOR: validationMessage(
    'INVALID_NOTA_ENTRENADOR',
    'nota_entrenador debe ser texto.',
  ),
  EMPTY_NOTA_ENTRENADOR: validationMessage(
    'EMPTY_NOTA_ENTRENADOR',
    'nota_entrenador no debe venir vacío.',
  ),
  NOTA_ENTRENADOR_TOO_LONG: validationMessage(
    'NOTA_ENTRENADOR_TOO_LONG',
    'nota_entrenador no puede exceder 1000 caracteres.',
  ),

  INVALID_LINK_APOYO: validationMessage(
    'INVALID_LINK_APOYO',
    'link_apoyo debe ser una URL válida con http o https.',
  ),
  INVALID_LINK_APOYO_TYPE: validationMessage(
    'INVALID_LINK_APOYO_TYPE',
    'link_apoyo debe ser texto.',
  ),
  EMPTY_LINK_APOYO: validationMessage('EMPTY_LINK_APOYO', 'link_apoyo no debe venir vacío.'),
  LINK_APOYO_TOO_LONG: validationMessage(
    'LINK_APOYO_TOO_LONG',
    'link_apoyo no puede exceder 500 caracteres.',
  ),
} as const;
