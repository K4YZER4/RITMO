import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { SinSuscripcion } from './common/decorators/sin-suscripcion.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Health check',
    description: 'Punto de verificación del servicio. No exige autenticación ni suscripción.',
  })
  @ApiOkResponse({
    description: 'Información básica de la API.',
    schema: { example: { name: 'RITMO API', status: 'ok', docs: '/api/docs' } },
  })
  getRoot() {
    return {
      name: 'RITMO API',
      status: 'ok',
      docs: '/api/docs',
    };
  }

  @Get('health')
  @Public()
  @SinSuscripcion()
  @ApiOperation({ summary: 'Comprobar la salud de la API y PostgreSQL' })
  @ApiOkResponse({
    description: 'La API y la base de datos están disponibles.',
    schema: {
      example: {
        status: 'ok',
        database: 'connected',
        timestamp: '2026-11-05T00:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
