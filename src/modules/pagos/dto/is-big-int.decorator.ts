import { registerDecorator, ValidationOptions } from 'class-validator';
import { validationMessage } from '../../../common/exception/validation-message';

// Crea un validador personalizado para el tipo 'bigint'
export function IsBigInt(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBigInt',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'bigint'; // Verifica si es tipo bigint
        },
        defaultMessage() {
          return validationMessage('INVALID_BIGINT', 'El campo debe ser un BigInt.');
        },
      },
    });
  };
}
