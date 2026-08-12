import { validationMessage } from '../validation-message';

export const ALUMNO_ENTRENADOR_VALIDATION_ERRORS = {
  REQUIRED_CODIGO: validationMessage('REQUIRED_CODIGO', 'El código del token es obligatorio.'),
  INVALID_CODIGO: validationMessage('INVALID_CODIGO', 'El código del token debe ser texto.'),

  REQUIRED_SECRETO: validationMessage('REQUIRED_SECRETO', 'El secreto del token es obligatorio.'),
  INVALID_SECRETO: validationMessage('INVALID_SECRETO', 'El secreto del token debe ser texto.'),

  REQUIRED_ID_ENTRENADOR: validationMessage(
    'REQUIRED_ID_ENTRENADOR',
    'El id del entrenador es obligatorio.',
  ),
  INVALID_ID_ENTRENADOR: validationMessage(
    'INVALID_ID_ENTRENADOR',
    'El id del entrenador debe ser un UUID válido.',
  ),

  REQUIRED_ID_ALUMNO: validationMessage('REQUIRED_ID_ALUMNO', 'El id del alumno es obligatorio.'),
  INVALID_ID_ALUMNO: validationMessage(
    'INVALID_ID_ALUMNO',
    'El id del alumno debe ser un UUID válido.',
  ),

  REQUIRED_CONTRASEÑA_ALUMNO: validationMessage(
    'REQUIRED_CONTRASEÑA_ALUMNO',
    'La contraseña del alumno es obligatoria.',
  ),
  INVALID_CONTRASEÑA_ALUMNO: validationMessage(
    'INVALID_CONTRASEÑA_ALUMNO',
    'La contraseña del alumno debe ser texto.',
  ),
} as const;
