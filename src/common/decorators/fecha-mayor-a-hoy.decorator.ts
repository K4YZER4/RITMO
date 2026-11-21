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

          // Se tolera un margen de hasta 36 horas hacia atrás para considerar
          // las zonas horarias de América (UTC-3 a UTC-8 o más al oeste) respecto
          // a la hora UTC del servidor, asegurando que la fecha local del usuario
          // nunca sea rechazada por desfase horario.
          const bufferDate = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
          return value >= bufferDate;
        },

        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser mayor o igual a la fecha actual`;
        },
      },
    });
  };
}
