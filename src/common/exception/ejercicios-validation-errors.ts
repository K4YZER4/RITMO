import { validationMessage } from './validation-message';

export const EJERCICIOS_VALIDATION_ERRORS = {
  REQUIRED_CREATED_BY_USUARIO: validationMessage(
    'REQUIRED_CREATED_BY_USUARIO',
    'El id del usuario creador es obligatorio.',
  ),
  INVALID_CREATED_BY_USUARIO: validationMessage(
    'INVALID_CREATED_BY_USUARIO',
    'El id del usuario creador debe ser un UUID válido.',
  ),

  REQUIRED_NOMBRE: validationMessage('REQUIRED_NOMBRE', 'El nombre es obligatorio.'),
  INVALID_NOMBRE: validationMessage('INVALID_NOMBRE', 'El nombre debe ser texto.'),
  NOMBRE_TOO_LONG: validationMessage(
    'NOMBRE_TOO_LONG',
    'El nombre no puede exceder los 150 caracteres.',
  ),

  INVALID_ACTIVA: validationMessage('INVALID_ACTIVA', 'El campo activa debe ser booleano.'),

  INVALID_DESCRIPCION: validationMessage('INVALID_DESCRIPCION', 'La descripción debe ser texto.'),
  REQUIRED_DESCRIPCION: validationMessage(
    'REQUIRED_DESCRIPCION',
    'La descripción no puede estar vacía.',
  ),

  INVALID_URL_IMAGEN_TYPE: validationMessage(
    'INVALID_URL_IMAGEN_TYPE',
    'La URL de la imagen debe ser texto.',
  ),
  REQUIRED_URL_IMAGEN: validationMessage(
    'REQUIRED_URL_IMAGEN',
    'La URL de la imagen no puede estar vacía.',
  ),
  INVALID_URL_IMAGEN: validationMessage(
    'INVALID_URL_IMAGEN',
    'La URL de la imagen debe tener un formato válido.',
  ),

  INVALID_LINK_INFORMACION_TYPE: validationMessage(
    'INVALID_LINK_INFORMACION_TYPE',
    'El link de información debe ser texto.',
  ),
  REQUIRED_LINK_INFORMACION: validationMessage(
    'REQUIRED_LINK_INFORMACION',
    'El link de información no puede estar vacío.',
  ),
  INVALID_LINK_INFORMACION: validationMessage(
    'INVALID_LINK_INFORMACION',
    'El link de información debe tener un formato válido.',
  ),

  REQUIRED_MUSCULOS: validationMessage('REQUIRED_MUSCULOS', 'Los músculos son obligatorios.'),
  INVALID_MUSCULOS: validationMessage('INVALID_MUSCULOS', 'Los músculos deben ser un arreglo.'),
  EMPTY_MUSCULOS: validationMessage(
    'EMPTY_MUSCULOS',
    'El arreglo de músculos no puede estar vacío.',
  ),
  MUSCULOS_MIN_LENGTH: validationMessage(
    'MUSCULOS_MIN_LENGTH',
    'Debes enviar al menos un músculo.',
  ),
  DUPLICATED_MUSCULOS: validationMessage(
    'DUPLICATED_MUSCULOS',
    'El arreglo de músculos no debe contener elementos duplicados.',
  ),
  INVALID_MUSCULO_ID: validationMessage(
    'INVALID_MUSCULO_ID',
    'Cada músculo debe ser un número entero.',
  ),

  INVALID_EQUIPOS: validationMessage('INVALID_EQUIPOS', 'Los equipos deben ser un arreglo.'),
  DUPLICATED_EQUIPOS: validationMessage(
    'DUPLICATED_EQUIPOS',
    'El arreglo de equipos no debe contener elementos duplicados.',
  ),
  INVALID_EQUIPO_ID: validationMessage(
    'INVALID_EQUIPO_ID',
    'Cada equipo debe ser un número entero.',
  ),

  REQUIRED_ID: validationMessage('REQUIRED_ID', 'El id es obligatorio.'),
  INVALID_ID: validationMessage('INVALID_ID', 'El id debe ser numérico.'),
} as const;
