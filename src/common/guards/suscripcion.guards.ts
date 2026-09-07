import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuscripcionesService } from '../../modules/suscripciones/suscripciones.service';
import { ES_RUTA_SIN_SUSCRIPCION } from '../decorators/sin-suscripcion.decorator';

@Injectable()
export class SuscripcionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly suscripcionesService: SuscripcionesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const omitirValidacion = this.reflector.getAllAndOverride<boolean>(ES_RUTA_SIN_SUSCRIPCION, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (omitirValidacion) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { sub?: string };
      suscripcion?: unknown;
    }>();

    const usuarioId = request.user?.sub;

    // Si el JWT guard no puso el usuario, no hay acceso.
    if (!usuarioId) {
      throw new UnauthorizedException('Debes iniciar sesión.');
    }

    // Lanza ForbiddenException si está vencida, impaga o no existe.
    const suscripcion = await this.suscripcionesService.validarAccesoSuscripcion(usuarioId);

    // Disponible para controllers/decoradores posteriores.
    request.suscripcion = suscripcion;

    return true;
  }
}
