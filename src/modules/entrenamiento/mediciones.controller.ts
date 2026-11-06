import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegistrarMedicionDto } from './dto/registrar-medicion.dto';
import { EntrenamientoService } from './entrenamiento.service';

@ApiTags('Mediciones')
@ApiBearerAuth('access-token')
@Controller('mediciones')
export class MedicionesController {
  constructor(private readonly service: EntrenamientoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar las mediciones del alumno' })
  listar(@CurrentUser('id') usuarioId: string) {
    return this.service.listarMediciones(usuarioId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear o actualizar una medición diaria' })
  registrar(@CurrentUser('id') usuarioId: string, @Body() dto: RegistrarMedicionDto) {
    return this.service.registrarMedicion(usuarioId, dto);
  }
}
