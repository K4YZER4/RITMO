import { Prisma } from '@prisma/client';

const RETRYABLE_TRANSACTION_CODES = new Set(['P2028', 'P2034']);

export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        RETRYABLE_TRANSACTION_CODES.has(error.code);

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 50));
    }
  }

  throw lastError;
}
