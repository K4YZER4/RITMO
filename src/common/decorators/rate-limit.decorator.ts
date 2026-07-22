import { Throttle } from '@nestjs/throttler';

export const RateLimitEspecifico = (limit: number, ttl = 1000) =>
  Throttle({ default: { limit, ttl } });
