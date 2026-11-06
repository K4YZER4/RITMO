import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsPastDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isPastDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const parsedDate = new Date(`${value}T00:00:00.000Z`);
          if (Number.isNaN(parsedDate.getTime())) {
            return false;
          }

          return value < new Date().toISOString().slice(0, 10);
        },

        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser una fecha anterior a hoy`;
        },
      },
    });
  };
}
