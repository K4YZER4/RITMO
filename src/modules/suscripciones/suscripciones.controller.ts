import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SuscripcionesService } from './suscripciones.service';
import { SinSuscripcion } from '../../common/decorators/sin-suscripcion.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CambiarPlanDto } from './dto/cambiar-plan.dto';

@ApiTags('Suscripciones')
@ApiBearerAuth('access-token')
@Controller('suscripciones')
export class SuscripcionesController {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  @Get('actual')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Obtener suscripción actual',
    description:
      'Devuelve la suscripción actual del usuario autenticado, con su plan y el último pago.',
  })
  @ApiOkResponse({
    description: 'Suscripción actual encontrada.',
    schema: {
      example: {
        id: '1',
        estado: 'prueba',
        periodoActualInicio: '2026-09-01T00:00:00.000Z',
        periodoActualFin: '2026-10-01T00:00:00.000Z',
        planAlumno: { id: 1, nombre: 'Plan Básico' },
        planEntrenador: null,
        pagos: [],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Rol no válido para suscripciones.' })
  @ApiResponse({ status: 404, description: 'Usuario o suscripción actual no encontrada.' })
  obtenerActual(@CurrentUser('id') usuarioId: string) {
    return this.suscripcionesService.obtenerSuscripcionActual(usuarioId);
  }

  @Get('estado-pago')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Obtener estado de pago',
    description: 'Devuelve el estado del último pago de la suscripción actual.',
  })
  @ApiOkResponse({
    description: 'Estado de pago.',
    schema: { example: { estado: 'pagado' } },
  })
  @ApiResponse({ status: 403, description: 'La suscripción ha expirado.' })
  @ApiResponse({ status: 404, description: 'Suscripción o estado de pago no encontrado.' })
  obtenerEstadoPago(@CurrentUser('id') usuarioId: string) {
    return this.suscripcionesService.obtenerEstadoPago(usuarioId);
  }

  @Patch('plan')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Cambiar de plan',
    description: 'Cambia el plan del usuario autenticado (según su rol).',
  })
  @ApiOkResponse({
    description: 'Plan cambiado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'No puedes cambiar de plan mientras exista una suscripción Stripe activa.',
  })
  @ApiResponse({ status: 403, description: 'Rol no válido para cambiar plan.' })
  @ApiResponse({ status: 404, description: 'Suscripción o plan no encontrado.' })
  cambiarPlan(@CurrentUser('id') usuarioId: string, @Body() dto: CambiarPlanDto) {
    return this.suscripcionesService.cambiarPlan(usuarioId, dto.idPlanNuevo);
  }

  @Post('cancelar')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Cancelar suscripción',
    description: 'Cancela la suscripción Stripe al final del periodo actual.',
  })
  @ApiCreatedResponse({ description: 'Suscripción cancelada al final del periodo.' })
  @ApiResponse({
    status: 400,
    description: 'Suscripción vitalicia o sin suscripción Stripe activa para cancelar.',
  })
  @ApiResponse({ status: 404, description: 'Suscripción actual no encontrada.' })
  @ApiResponse({
    status: 409,
    description: 'La suscripción ya está programada para cancelarse al final del periodo.',
  })
  cancelar(@CurrentUser('id') usuarioId: string) {
    return this.suscripcionesService.cancelarSuscripcion(usuarioId);
  }

  @Post('reanudar')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Reanudar suscripción',
    description: 'Reanuda una suscripción que estaba programada para cancelarse.',
  })
  @ApiCreatedResponse({ description: 'Suscripción reanudada.' })
  @ApiResponse({
    status: 400,
    description: 'La suscripción no está programada para cancelarse o no tiene Stripe activo.',
  })
  @ApiResponse({ status: 404, description: 'Suscripción actual no encontrada.' })
  reanudar(@CurrentUser('id') usuarioId: string) {
    return this.suscripcionesService.reanudarSuscripcion(usuarioId);
  }
}
