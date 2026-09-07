import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guards';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

function crearContexto(authorization?: string): ExecutionContext {
  const headers: Record<string, string | undefined> = {};
  if (authorization) {
    headers.authorization = authorization;
  }

  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    reflector = asReflector();
    guard = new JwtAuthGuard(jwtService, reflector);
  });

  function asReflector(): Reflector {
    return {
      getAllAndOverride: jest.fn((key: string) => undefined),
    } as unknown as Reflector;
  }

  it('debe permitir el acceso a rutas públicas sin token', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(crearContexto());

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('debe lanzar UnauthorizedException si no hay header de autorización', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    await expect(guard.canActivate(crearContexto())).rejects.toThrow(
      new UnauthorizedException('Missing Authorization header'),
    );
  });

  it('debe lanzar UnauthorizedException si el formato es inválido', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    await expect(guard.canActivate(crearContexto('Basic abc'))).rejects.toThrow(
      new UnauthorizedException('Invalid Authorization format'),
    );
  });

  it('debe lanzar UnauthorizedException si el payload no tiene sub', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      id: usuarioId,
      correo: 'x@x.com',
    });

    await expect(guard.canActivate(crearContexto('Bearer token'))).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('debe lanzar UnauthorizedException si el sub no es un UUID válido', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      id: usuarioId,
      correo: 'x@x.com',
      sub: 'no-es-un-uuid',
    });

    await expect(guard.canActivate(crearContexto('Bearer token'))).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  it('debe asignar el payload al request cuando el token es válido', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const payload = { id: usuarioId, correo: 'x@x.com', sub: usuarioId, role: 'alumno' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

    const req: { headers: Record<string, string | undefined>; user?: unknown } = {
      headers: { authorization: 'Bearer token' },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual(payload);
  });
});
