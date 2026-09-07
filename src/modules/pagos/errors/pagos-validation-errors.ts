import { validationMessage } from '../../../common/exception/validation-message';

export const PAGOS_VALIDATION_ERRORS = {
  REQUIRED_PAGO_ID: validationMessage('REQUIRED_PAGO_ID', 'El id del pago es obligatorio.'),
  INVALID_PAGO_ID: validationMessage('INVALID_PAGO_ID', 'El id del pago debe ser un BigInt.'),

  REQUIRED_SUSCRIPCION_ID: validationMessage(
    'REQUIRED_SUSCRIPCION_ID',
    'El id de la suscripción es obligatorio.',
  ),
  INVALID_SUSCRIPCION_ID: validationMessage(
    'INVALID_SUSCRIPCION_ID',
    'El id de la suscripción debe ser un BigInt.',
  ),
} as const;
