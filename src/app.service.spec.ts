import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;
  const prismaMock = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(AppService);
  });

  it('reports a healthy database connection', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);

    await expect(service.getHealth()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: expect.any(String),
    });
  });

  it('reports an unavailable service when the database is down', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('database down'));

    await expect(service.getHealth()).rejects.toThrow(ServiceUnavailableException);
  });
});
