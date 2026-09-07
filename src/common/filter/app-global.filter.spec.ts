import { type ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppBadRequestException } from '../exception/app-bad-request';
import { GlobalExceptionFilter } from './app-global.filter';
const FIXED_DATE = new Date('2026-08-18T15:00:00.000Z');

type ErrorResponseBody = {
  requestId: string | null;
  code: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details: Record<string, unknown> | null;
};

function createHost() {
  const json = jest.fn<void, [ErrorResponseBody]>();

  const status = jest.fn<{ json: typeof json }, [number]>(() => ({
    json,
  }));

  const request = {
    url: '/test',
    requestId: 'req-123',
  };

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return {
    filter: new GlobalExceptionFilter(),
    ctx,
    status,
    json,
  };
}

describe('GlobalExceptionFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it('normaliza AppBadRequestException a 400 con shape completo', () => {
    const { filter, ctx, status, json } = createHost();

    filter.catch(
      new AppBadRequestException('INVALID_INPUT', 'Campo inválido', { field: 'correo' }),
      ctx,
    );

    expect(status).toHaveBeenCalledWith(400);

    expect(json).toHaveBeenCalledWith({
      requestId: 'req-123',
      code: 'INVALID_INPUT',
      message: 'Campo inválido',
      statusCode: 400,
      timestamp: FIXED_DATE.toISOString(),
      path: '/test',
      details: { field: 'correo' },
    });
  });

  it('normaliza UnauthorizedException a 401', () => {
    const { filter, ctx, status, json } = createHost();

    filter.catch(new UnauthorizedException('Contraseña incorrecta'), ctx);

    expect(status).toHaveBeenCalledWith(401);

    expect(json).toHaveBeenCalledWith({
      requestId: 'req-123',
      code: 'HTTP_EXCEPTION',
      message: 'Contraseña incorrecta',
      statusCode: 401,
      timestamp: FIXED_DATE.toISOString(),
      path: '/test',
      details: null,
    });
  });

  it('mapea Prisma P2002 a 409 PRISMA_UNIQUE_CONSTRAINT', () => {
    const { filter, ctx, status, json } = createHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: { target: ['correo'] },
    });

    filter.catch(prismaError, ctx);

    expect(status).toHaveBeenCalledWith(409);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        code: 'PRISMA_UNIQUE_CONSTRAINT',
        statusCode: 409,
        path: '/test',
      }),
    );

    const responseBody = json.mock.calls[0]?.[0];

    if (
      typeof responseBody !== 'object' ||
      responseBody === null ||
      !('message' in responseBody) ||
      typeof responseBody.message !== 'string'
    ) {
      throw new Error('La respuesta debe incluir message como string');
    }

    expect(responseBody.message).toContain('correo');
  });

  it('mapea Prisma P2025 a 404 PRISMA_OPERATION_RECORD_NOT_FOUND', () => {
    const { filter, ctx, status, json } = createHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.0.0',
    });

    filter.catch(prismaError, ctx);

    expect(status).toHaveBeenCalledWith(404);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        code: 'PRISMA_OPERATION_RECORD_NOT_FOUND',
        statusCode: 404,
        path: '/test',
      }),
    );
  });

  it('normaliza un error inesperado a 500', () => {
    const { filter, ctx, status, json } = createHost();

    filter.catch(new Error('boom'), ctx);

    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith({
      requestId: 'req-123',
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno del servidor.',
      statusCode: 500,
      timestamp: FIXED_DATE.toISOString(),
      path: '/test',
      details: null,
    });
  });
});
