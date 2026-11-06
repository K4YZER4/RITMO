import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../../common/pipes/parse-big-int.pipe';
import { ActualizarSetDto } from './dto/actualizar-set.dto';
import { FinalizarSesionDto } from './dto/finalizar-sesion.dto';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { EntrenamientoService } from './entrenamiento.service';

@ApiTags('Sesiones de entrenamiento')
@ApiBearerAuth('access-token')
@Controller('sesiones')
export class SesionesController {
  constructor(private readonly service: EntrenamientoService) {}

  @Post()
  @ApiOperation({ summary: 'Iniciar una sesión desde una rutina asignada' })
  iniciar(@CurrentUser('id') usuarioId: string, @Body() dto: IniciarSesionDto) {
    return this.service.iniciarSesion(usuarioId, BigInt(dto.usuario_rutina_id));
  }

  @Get()
  @ApiOperation({ summary: 'Obtener el historial de sesiones del alumno' })
  historial(@CurrentUser('id') usuarioId: string) {
    return this.service.obtenerHistorial(usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una sesión' })
  obtener(@CurrentUser('id') usuarioId: string, @Param('id', ParseBigIntPipe) sesionId: bigint) {
    return this.service.obtenerSesion(usuarioId, sesionId);
  }

  @Patch(':sesionId/sets/:setId')
  @ApiOperation({ summary: 'Registrar el resultado de un set' })
  actualizarSet(
    @CurrentUser('id') usuarioId: string,
    @Param('sesionId', ParseBigIntPipe) sesionId: bigint,
    @Param('setId', ParseBigIntPipe) setId: bigint,
    @Body() dto: ActualizarSetDto,
  ) {
    return this.service.actualizarSet(usuarioId, sesionId, setId, dto);
  }

  @Post(':id/finalizar')
  @ApiOperation({ summary: 'Finalizar una sesión de entrenamiento' })
  finalizar(
    @CurrentUser('id') usuarioId: string,
    @Param('id', ParseBigIntPipe) sesionId: bigint,
    @Body() dto: FinalizarSesionDto,
  ) {
    return this.service.finalizarSesion(usuarioId, sesionId, dto);
  }
}
