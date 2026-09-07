import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsTodayOrFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isTodayOrFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === null || value === undefined || value === '') {
            return false;
          }

          if (typeof value !== 'string') {
            return false;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const today = new Date().toLocaleDateString('en-CA');
          return value >= today;
        },

        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser mayor o igual a la fecha actual`;
        },
      },
    });
  };
}
