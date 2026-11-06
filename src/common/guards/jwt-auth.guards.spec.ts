import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from './jwt-auth.guards';
import { PrismaService } from '../../prisma/prisma.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

function crearContexto<ReqT extends { headers: Record<string, string | undefined> }>(
  request?: ReqT,
): ExecutionContext {
  const req = request ?? ({
    headers: {},
  } as ReqT);

  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;
  let prisma: PrismaService;

  const prismaMock = {
    tokenRevocado: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    reflector = asReflector();
    prisma = prismaMock as unknown as PrismaService;
    guard = new JwtAuthGuard(jwtService, reflector, prisma);
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

    await expect(
      guard.canActivate(crearContexto({ headers: { authorization: 'Basic credenciales' } })),
    ).rejects.toThrow(new UnauthorizedException('Invalid Authorization format'));
  });

  it('debe lanzar UnauthorizedException si el payload no tiene sub', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      id: usuarioId,
      correo: 'x@x.com',
    });

    await expect(
      guard.canActivate(crearContexto({ headers: { authorization: 'Bearer token' } })),
    ).rejects.toThrow(new UnauthorizedException('Invalid token payload'));
  });

  it('debe lanzar UnauthorizedException si el sub no es un UUID válido', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      id: usuarioId,
      correo: 'x@x.com',
      sub: 'no-es-un-uuid',
    });

    await expect(
      guard.canActivate(crearContexto({ headers: { authorization: 'Bearer token' } })),
    ).rejects.toThrow(new UnauthorizedException('Invalid user ID in token'));
  });

  it('debe asignar el payload al request cuando el token es válido y no está revocado', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const payload = { id: usuarioId, correo: 'x@x.com', sub: usuarioId, role: 'alumno', jti: 'jti-1' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
    prismaMock.tokenRevocado.findUnique.mockResolvedValue(null);

    const req: { headers: Record<string, string | undefined>; user?: unknown } = {
      headers: { authorization: 'Bearer token' },
    };
    const result = await guard.canActivate(crearContexto(req));

    expect(result).toBe(true);
    expect(req.user).toEqual(payload);
    expect(prismaMock.tokenRevocado.findUnique).toHaveBeenCalledWith({
      where: { jti: 'jti-1' },
      select: { jti: true },
    });
  });

  it('debe permitir tokens sin jti (legacy) sin consultar la denylist', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const payload = { id: usuarioId, correo: 'x@x.com', sub: usuarioId, role: 'alumno' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);

    const req: { headers: Record<string, string | undefined>; user?: unknown } = {
      headers: { authorization: 'Bearer token' },
    };
    const result = await guard.canActivate(crearContexto(req));

    expect(result).toBe(true);
    expect(req.user).toEqual(payload);
    expect(prismaMock.tokenRevocado.findUnique).not.toHaveBeenCalled();
  });

  it('debe lanzar UnauthorizedException si el jti del token está revocado', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const payload = { id: usuarioId, correo: 'x@x.com', sub: usuarioId, role: 'alumno', jti: 'jti-2' };
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
    prismaMock.tokenRevocado.findUnique.mockResolvedValue({ jti: 'jti-2' });

    await expect(
      guard.canActivate(
        crearContexto({ headers: { authorization: 'Bearer token' } }),
      ),
    ).rejects.toThrow(new UnauthorizedException('Token revocado'));
  });
});
