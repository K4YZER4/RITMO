import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { ProcesarCheckoutCompletadoHandler } from './handlers/procesar-chekout-completado.handler';
import { ProcesarFacturaHandler } from './handlers/procesar-factura.handler';
@Module({
  imports: [SuscripcionesModule, PrismaModule, StripeModule],
  controllers: [PagosController],
  providers: [PagosService, ProcesarCheckoutCompletadoHandler, ProcesarFacturaHandler],
  exports: [PagosService],
})
export class PagosModule {}
