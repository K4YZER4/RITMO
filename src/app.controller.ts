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
    description: 'El servicio está activo.',
    schema: { example: 'Hello World!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
