import type { TransformFnParams } from 'class-transformer';

export function normalizeEmail({ value }: TransformFnParams): unknown {
  const email: unknown = value;

  return typeof email === 'string' ? email.trim().toLowerCase() : email;
}
