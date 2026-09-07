import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { RUTINAS_VALIDATION_ERRORS } from '../errors/rutinas-validation-errors';

@ValidatorConstraint({ name: 'rutinaEjercicioConReferencia', async: false })
export class RutinaEjercicioConReferenciaConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    const ejercicio = value as Record<string, unknown>;

    return (
      ejercicio.id_ejercicio_estandar !== undefined ||
      ejercicio.id_ejercicio_personalizado !== undefined
    );
  }

  defaultMessage(): string {
    return RUTINAS_VALIDATION_ERRORS.REQUIRED_ID_EJERCICIO;
  }
}
