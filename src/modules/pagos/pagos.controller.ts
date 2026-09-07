import { Body, Controller, Post, Req, Logger } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '../../types/raw-body-request';
import { PagosService } from './pagos.service';
import { SinSuscripcion } from '../../common/decorators/sin-suscripcion.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CrearCheckoutDto } from './dto/crear-checkout.dto';
import { Public } from '../../common/decorators/public.decorator';
@ApiTags('Pagos')
@ApiBearerAuth('access-token')
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}
  private readonly logger = new Logger(PagosController.name);

  @Post('webhook/stripe')
  @Public()
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Webhook de Stripe',
    description:
      'Recibe los webhooks de Stripe, verifica la firma (`stripe-signature`) y procesa el evento correspondiente.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Firma del payload enviada por Stripe. Se verifica con STRIPE_WEBHOOK_SECRET.',
  })
  @ApiCreatedResponse({
    description: 'Evento procesado (o ignorado/duplicado según corresponda).',
    schema: {
      example: { recibido: true, tipo: 'invoice.paid' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Webhook incompleto, firma inválida o metadata inválida.',
  })
  @ApiResponse({ status: 404, description: 'Pago o suscripción local no encontrado.' })
  async webhookStripe(@Req() req: RawBodyRequest) {
    const signature = req.headers['stripe-signature'] as string | undefined;

    this.logger.log(`Webhook Stripe recibido. rawBody: ${!!req.rawBody}; firma: ${!!signature}`);

    try {
      const resultado = await this.pagosService.procesarWebhookStripe(req.rawBody, signature);

      this.logger.log('Webhook Stripe procesado correctamente');

      return resultado;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Error procesando webhook Stripe: ${mensaje}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  @Post('checkout')
  @SinSuscripcion()
  @ApiOperation({
    summary: 'Crear sesión de Checkout',
    description:
      'Crea una sesión de Stripe Checkout para un pago pendiente, o reutiliza una sesión abierta existente.',
  })
  @ApiCreatedResponse({
    description: 'URL de la sesión de Checkout creada o reutilizada.',
    schema: {
      example: { url: 'https://checkout.stripe.com/c/pay/...', reutilizada: false },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Pago no corresponde a la suscripción o ya fue procesado.',
  })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este pago.' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado.' })
  async crearCheckout(@CurrentUser('id') usuarioId: string, @Body() dto: CrearCheckoutDto) {
    return this.pagosService.crearCheckout(usuarioId, dto.pagoId, dto.suscripcionId);
  }
}
