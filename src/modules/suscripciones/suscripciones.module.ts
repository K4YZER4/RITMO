import { Module } from '@nestjs/common';
import { SuscripcionesService } from './suscripciones.service';
import { SuscripcionesController } from './suscripciones.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { ActivarSuscripcionInicialHandler } from './handlers/activar-suscripcion-inicial.handler';
import { ActualizarSuscripcionPorPagoHandler } from './handlers/actualizar-suscripcion-por-pago.handler';
import { CambiarPlanSuscripcionHandler } from './handlers/cambiar-plan-suscripcion.handler';
import { CrearSuscripcionPendientePagoService } from './services/crear-suscripcion-pendiente-pago.service';
@Module({
  controllers: [SuscripcionesController],
  providers: [
    SuscripcionesService,
    ActivarSuscripcionInicialHandler,
    ActualizarSuscripcionPorPagoHandler,
    CambiarPlanSuscripcionHandler,
    CrearSuscripcionPendientePagoService,
  ],
  imports: [PrismaModule, StripeModule],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}
