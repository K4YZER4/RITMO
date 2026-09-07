import { Transform } from 'class-transformer';

function trasformarABigInt({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return value;
  }

  const texto = String(value);

  if (/^\d+$/.test(texto)) {
    return BigInt(texto);
  }

  return value;
}

export function ToBigInt(): PropertyDecorator {
  return Transform(trasformarABigInt);
}
