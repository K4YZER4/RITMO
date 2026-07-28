import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsAfterOrEqualTo(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isAfterOrEqualTo',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === null || value === undefined || value === '') {
            return true;
          }

          if (typeof value !== 'string') {
            return false;
          }

          const constraints = args.constraints as [string];
          const relatedPropertyName = constraints[0];

          const obj = args.object as Record<string, unknown>;
          const relatedValue = obj[relatedPropertyName];

          if (relatedValue === null || relatedValue === undefined || relatedValue === '') {
            return true;
          }

          if (typeof relatedValue !== 'string') {
            return false;
          }

          const currentDate = new Date(value);
          const relatedDate = new Date(relatedValue);

          if (Number.isNaN(currentDate.getTime()) || Number.isNaN(relatedDate.getTime())) {
            return false;
          }

          return currentDate.getTime() >= relatedDate.getTime();
        },

        defaultMessage(args: ValidationArguments): string {
          const constraints = args.constraints as [string];
          const relatedPropertyName = constraints[0];
          return `${args.property} debe ser mayor o igual que ${relatedPropertyName}`;
        },
      },
    });
  };
}
