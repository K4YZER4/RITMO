import { Prisma } from '@prisma/client';

import { withTransactionRetry } from './transaction-retry';

describe('withTransactionRetry', () => {
  it('retries transient transaction failures', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('transaction closed', {
          code: 'P2028',
          clientVersion: '7.8.0',
        }),
      )
      .mockResolvedValue('ok');

    await expect(withTransactionRetry(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transaction errors', async () => {
    const operation = jest.fn<Promise<void>, []>().mockRejectedValue(new Error('invalid input'));

    await expect(withTransactionRetry(operation)).rejects.toThrow('invalid input');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
