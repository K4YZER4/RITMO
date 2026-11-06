import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EntrenamientoService } from './entrenamiento.service';

@ApiTags('Progreso')
@ApiBearerAuth('access-token')
@Controller('progreso')
export class ProgresoController {
  constructor(private readonly service: EntrenamientoService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Obtener resumen de entrenamiento y récords personales' })
  obtenerResumen(@CurrentUser('id') usuarioId: string) {
    return this.service.obtenerResumenProgreso(usuarioId);
  }
}
