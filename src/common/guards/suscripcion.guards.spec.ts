import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SuscripcionGuard } from './suscripcion.guards';
import { SuscripcionesService } from '../../modules/suscripciones/suscripciones.service';

describe('SuscripcionGuard', () => {
  let guard: SuscripcionGuard;
  let reflector: Reflector;
  let suscripcionesService: SuscripcionesService;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(() => undefined),
    } as unknown as Reflector;
    suscripcionesService = {
      validarAccesoSuscripcion: jest.fn(),
    } as unknown as SuscripcionesService;
    guard = new SuscripcionGuard(reflector, suscripcionesService);
  });

  it('debe permitir el acceso a rutas sin suscripción', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(crearContexto());

    expect(result).toBe(true);
    expect(suscripcionesService.validarAccesoSuscripcion).not.toHaveBeenCalled();
  });

  it('debe lanzar UnauthorizedException si el request no tiene sub', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    await expect(guard.canActivate(crearContexto())).rejects.toThrow(
      new UnauthorizedException('Debes iniciar sesión.'),
    );
    expect(suscripcionesService.validarAccesoSuscripcion).not.toHaveBeenCalled();
  });

  it('debe validar la suscripción usando el sub y exponerla en el request', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    const suscripcion = { id: BigInt(1), estado: 'activa' };
    (suscripcionesService.validarAccesoSuscripcion as jest.Mock).mockResolvedValue(suscripcion);

    const req = {
      user: { sub: 'a12e4567-e89b-12d3-a456-426614174000' },
    };
    const result = await guard.canActivate(crearContexto(req));

    expect(suscripcionesService.validarAccesoSuscripcion).toHaveBeenCalledWith(
      'a12e4567-e89b-12d3-a456-426614174000',
    );
    expect((req as { suscripcion?: unknown }).suscripcion).toEqual(suscripcion);
    expect(result).toBe(true);
  });

  function crearContexto(request?: Record<string, unknown>): ExecutionContext {
    return {
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request ?? {},
      }),
    } as unknown as ExecutionContext;
  }
});
