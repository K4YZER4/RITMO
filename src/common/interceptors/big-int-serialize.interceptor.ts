import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function serializeBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInt);
  }

  const prototipo: object | null = Object.getPrototypeOf(value) as object | null;

  if (prototipo !== Object.prototype && prototipo !== null) {
    return value;
  }

  const objeto: Record<string, unknown> = value as Record<string, unknown>;
  const resultado: Record<string, unknown> = {};

  for (const [clave, valor] of Object.entries(objeto)) {
    resultado[clave] = serializeBigInt(valor);
  }

  return resultado;
}

@Injectable()
export class BigIntSerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInt(data)));
  }
}
