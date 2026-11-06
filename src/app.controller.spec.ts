import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appServiceMock = {
    getHealth: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appServiceMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API status', () => {
      expect(appController.getRoot()).toEqual({
        name: 'RITMO API',
        status: 'ok',
        docs: '/api/docs',
      });
    });

    it('should expose the database health check', async () => {
      const health = {
        status: 'ok' as const,
        database: 'connected' as const,
        timestamp: '2026-11-05T00:00:00.000Z',
      };
      appServiceMock.getHealth.mockResolvedValue(health);

      await expect(appController.getHealth()).resolves.toEqual(health);
    });
  });
});
