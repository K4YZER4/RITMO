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

          const inputDate = new Date(value);

          if (Number.isNaN(inputDate.getTime())) {
            return false;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const normalizedInputDate = new Date(inputDate);
          normalizedInputDate.setHours(0, 0, 0, 0);

          return normalizedInputDate.getTime() >= today.getTime();
        },

        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser mayor o igual a la fecha actual`;
        },
      },
    });
  };
}
