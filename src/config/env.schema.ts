import { z } from 'zod';

const requiredString = z.string().trim().min(1);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

  DATABASE_URL: requiredString,

  DIRECT_URL: requiredString,

  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET debe tener al menos 32 caracteres.',
  }),

  JWT_EXPIRATION_TIME: z.coerce.number().int().positive(),

  RATE_LIMIT_TTL: z.coerce.number().int().positive(),

  RATE_LIMIT_GLOBAL_LIMIT: z.coerce.number().int().positive(),

  STRIPE_SECRET_KEY: z
    .string()
    .trim()
    .regex(/^sk_(test|live)_/, {
      message: 'STRIPE_SECRET_KEY debe iniciar con sk_test_ o sk_live_.',
    }),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .regex(/^whsec_/, {
      message: 'STRIPE_WEBHOOK_SECRET debe iniciar con whsec_.',
    }),

  FRONTEND_URL: z.string().trim().url({
    message: 'FRONTEND_URL debe ser una URL válida.',
  }),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  return envSchema.parse(config);
}
