import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { SinSuscripcion } from '../../common/decorators/sin-suscripcion.decorator';
import { CatalogosService } from './catalogos.service';

@ApiTags('Catálogos')
@Controller('catalogos')
@Public()
@SinSuscripcion()
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener catálogos públicos para formularios' })
  @ApiOkResponse({ description: 'Catálogos activos de RITMO.' })
  obtenerCatalogos() {
    return this.catalogosService.obtenerCatalogos();
  }
}
