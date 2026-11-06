import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EntrenamientoService } from './entrenamiento.service';

@ApiTags('Entrenamientos')
@ApiBearerAuth('access-token')
@Controller('entrenamientos')
export class EntrenamientosController {
  constructor(private readonly service: EntrenamientoService) {}

  @Get('hoy')
  @ApiOperation({ summary: 'Obtener las rutinas asignadas para hoy' })
  obtenerHoy(@CurrentUser('id') usuarioId: string) {
    return this.service.obtenerEntrenamientoHoy(usuarioId);
  }

  @Get('semana')
  @ApiOperation({ summary: 'Obtener la planificación semanal activa' })
  obtenerSemana(@CurrentUser('id') usuarioId: string) {
    return this.service.obtenerSemana(usuarioId);
  }
}
