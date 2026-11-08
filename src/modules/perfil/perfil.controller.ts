import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PerfilService } from './perfil.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@ApiTags('Perfil')
@ApiBearerAuth('access-token')
@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil con datos de alumno o entrenador.' })
  obtenerPerfil(@CurrentUser('id') usuarioId: string) {
    return this.perfilService.obtenerPerfil(usuarioId);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar datos básicos del perfil' })
  actualizarPerfil(@CurrentUser('id') usuarioId: string, @Body() dto: ActualizarPerfilDto) {
    return this.perfilService.actualizarPerfil(usuarioId, dto);
  }
}
