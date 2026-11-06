import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PerfilService } from './perfil.service';

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
}
