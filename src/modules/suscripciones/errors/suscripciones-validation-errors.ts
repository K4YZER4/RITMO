import { validationMessage } from '../../../common/exception/validation-message';

export const SUSCRIPCIONES_VALIDATION_ERRORS = {
  REQUIRED_ID_PLAN_NUEVO: validationMessage(
    'REQUIRED_ID_PLAN_NUEVO',
    'El id del plan nuevo es obligatorio.',
  ),
  INVALID_ID_PLAN_NUEVO: validationMessage(
    'INVALID_ID_PLAN_NUEVO',
    'El id del plan nuevo debe ser un entero.',
  ),
  ID_PLAN_NUEVO_TOO_LOW: validationMessage(
    'ID_PLAN_NUEVO_TOO_LOW',
    'El id del plan nuevo debe ser mayor a 0.',
  ),
} as const;
