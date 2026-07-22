import { Throttle } from '@nestjs/throttler';

export const RateLimitEspecifico = (
  limit: number,
  ttl = parseInt(process.env.RATE_LIMIT_TTL!) ?? 1000,
) => Throttle({ default: { limit, ttl } });
