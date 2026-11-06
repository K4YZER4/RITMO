import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EntrenadorService } from './entrenador.service';

@ApiTags('Entrenador')
@ApiBearerAuth('access-token')
@Controller('entrenador')
export class EntrenadorController {
  constructor(private readonly entrenadorService: EntrenadorService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Obtener resumen del dashboard del entrenador' })
  obtenerResumen(@CurrentUser('id') usuarioId: string) {
    return this.entrenadorService.obtenerResumen(usuarioId);
  }

  @Get('alumnos')
  @ApiOperation({ summary: 'Listar alumnos vinculados al entrenador' })
  @ApiOkResponse({ description: 'Alumnos vinculados con estadísticas básicas.' })
  listarAlumnos(@CurrentUser('id') usuarioId: string) {
    return this.entrenadorService.listarAlumnos(usuarioId);
  }

  @Get('alumnos/:id')
  @ApiOperation({ summary: 'Obtener detalle de un alumno vinculado' })
  obtenerAlumno(
    @CurrentUser('id') usuarioId: string,
    @Param('id', ParseUUIDPipe) alumnoId: string,
  ) {
    return this.entrenadorService.obtenerAlumno(usuarioId, alumnoId);
  }
}
