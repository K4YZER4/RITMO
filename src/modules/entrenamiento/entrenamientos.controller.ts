import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EntrenamientoService } from './entrenamiento.service';
import { ReprogramarRutinaDto } from './dto/reprogramar-rutina.dto';

@ApiTags('Entrenamientos')
@ApiBearerAuth('access-token')
@Controller('entrenamientos')
export class EntrenamientosController {
  constructor(private readonly service: EntrenamientoService) {}

  @Get('hoy')
  @ApiOperation({ summary: 'Obtener las rutinas asignadas para hoy' })
  obtenerHoy(@CurrentUser('id') usuarioId: string, @Query('zona_horaria') zonaHoraria?: string) {
    return this.service.obtenerEntrenamientoHoy(usuarioId, zonaHoraria);
  }

  @Get('semana')
  @ApiOperation({ summary: 'Obtener la planificación semanal activa' })
  obtenerSemana(@CurrentUser('id') usuarioId: string, @Query('zona_horaria') zonaHoraria?: string) {
    return this.service.obtenerSemana(usuarioId, zonaHoraria);
  }

  @Post('reprogramar')
  @ApiOperation({ summary: 'Reprogramar una rutina pendiente solo para esta semana' })
  reprogramar(
    @CurrentUser('id') usuarioId: string,
    @Body() dto: ReprogramarRutinaDto,
    @Query('zona_horaria') zonaHoraria?: string,
  ) {
    return this.service.reprogramarRutinaPendiente(usuarioId, dto, zonaHoraria);
  }
}
