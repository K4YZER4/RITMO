import { Throttle } from '@nestjs/throttler';

export const RateLimitEspecifico = (limit: number, ttl = parseInt(process.env.RATE_LIMIT_TTL!)) =>
  Throttle({ default: { limit, ttl } });
