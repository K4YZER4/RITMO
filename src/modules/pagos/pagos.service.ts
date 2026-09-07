import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPagoEnum, EstadoSuscripcionEnum, Prisma, ProveedorPagoEnum } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { ProcesarCheckoutCompletadoHandler } from './handlers/procesar-chekout-completado.handler';
import { PrismaService } from '../../prisma/prisma.service';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { StripeService } from '../stripe/stripe.service';
import { ProcesarFacturaHandler } from './handlers/procesar-factura.handler';
@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suscripcionesService: SuscripcionesService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
    private readonly procesarFacturaHandler: ProcesarFacturaHandler,
    private readonly procesarCheckoutCompletadoHandler: ProcesarCheckoutCompletadoHandler,
  ) {}

  async crearCheckout(usuarioId: string, pagoId: bigint, suscripcionId: bigint) {
    const pago = await this.prisma.pago.findUnique({
      where: {
        id: pagoId,
      },
      select: {
        id: true,
        suscripcionId: true,
        estado: true,
        proveedor: true,
        proveedorPagoId: true,
        suscripcion: {
          select: {
            id: true,
            alumnoId: true,
            entrenadorId: true,
            proveedorCustomerId: true,
            proveedorPrecioIdSnapshot: true,
          },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.suscripcionId !== suscripcionId) {
      throw new BadRequestException('El pago no corresponde a la suscripción');
    }

    if (pago.proveedor !== ProveedorPagoEnum.stripe) {
      throw new BadRequestException('El pago no está configurado para Stripe');
    }

    if (pago.estado !== EstadoPagoEnum.pendiente) {
      throw new BadRequestException('El pago ya fue procesado o no puede cobrarse');
    }

    const suscripcion = pago.suscripcion;

    if (suscripcion.alumnoId !== usuarioId && suscripcion.entrenadorId !== usuarioId) {
      throw new ForbiddenException('No tienes acceso a este pago');
    }

    if (!suscripcion.proveedorPrecioIdSnapshot) {
      throw new BadRequestException('La suscripción no tiene un Stripe Price configurado');
    }

    if (pago.proveedorPagoId) {
      const checkoutExistente = await this.stripeService.obtenerCheckoutSession(
        pago.proveedorPagoId,
      );

      if (checkoutExistente.status === 'open' && checkoutExistente.url) {
        return {
          url: checkoutExistente.url,
          reutilizada: true,
        };
      }
    }

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    const session = await this.stripeService.crearCheckoutSuscripcion({
      pagoId: pago.id,
      suscripcionId: suscripcion.id,
      usuarioId,
      proveedorPriceId: suscripcion.proveedorPrecioIdSnapshot,
      customerId: suscripcion.proveedorCustomerId,
      successUrl: `${frontendUrl}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/pago/cancelado`,
    });

    if (!session.url) {
      throw new BadRequestException('Stripe no devolvió la URL de Checkout');
    }

    await this.prisma.pago.update({
      where: {
        id: pago.id,
      },
      data: {
        proveedorPagoId: session.id,
      },
    });

    return {
      url: session.url,
      reutilizada: false,
    };
  }

  async procesarWebhookStripe(rawBody: Buffer | undefined, firma: string | undefined) {
    if (!rawBody || !firma) {
      throw new BadRequestException('Webhook de Stripe incompleto');
    }

    const evento = this.stripeService.verificarWebhook(rawBody, firma);

    const esEventoNuevo = await this.registrarEventoSiEsNuevo(evento);

    if (!esEventoNuevo) {
      return {
        recibido: true,
        duplicado: true,
        tipo: evento.type,
      };
    }

    try {
      let resultado: unknown;

      switch (evento.type) {
        case 'checkout.session.completed':
          resultado = await this.procesarCheckoutCompletadoHandler.ejecutar(evento);
          break;

        case 'invoice.paid':
          resultado = await this.procesarFacturaHandler.procesarFacturaPagada(evento);
          break;

        case 'invoice.payment_failed':
          resultado = await this.procesarFacturaHandler.procesarFacturaFallida(evento);
          break;

        case 'customer.subscription.deleted':
          resultado = await this.procesarSuscripcionEliminada(evento);
          break;

        default:
          resultado = {
            recibido: true,
            ignorado: true,
            tipo: evento.type,
          };
      }

      await this.prisma.eventoStripe.update({
        where: {
          stripeEventId: evento.id,
        },
        data: {
          procesado: true,
          procesadoEn: new Date(),
          errorMensaje: null,
        },
      });

      return resultado;
    } catch (error) {
      await this.prisma.eventoStripe.update({
        where: {
          stripeEventId: evento.id,
        },
        data: {
          errorMensaje:
            error instanceof Error ? error.message : 'Error desconocido al procesar webhook',
        },
      });

      throw error;
    }
  }

  private async registrarEventoSiEsNuevo(evento: Stripe.Event): Promise<boolean> {
    try {
      await this.prisma.eventoStripe.create({
        data: {
          stripeEventId: evento.id,
          tipoEvento: evento.type,
          procesado: false,
          payload: evento as unknown as Prisma.InputJsonValue,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }

      throw error;
    }
  }
  private async procesarSuscripcionEliminada(evento: Stripe.Event) {
    const stripeSubscription = evento.data.object as Stripe.Subscription;

    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: {
        proveedor: ProveedorPagoEnum.stripe,
        proveedorSubscriptionId: stripeSubscription.id,
      },
      select: {
        id: true,
      },
    });

    if (!suscripcion) {
      return {
        recibido: true,
        ignorado: true,
        motivo: 'No existe una suscripción local relacionada',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.suscripcion.update({
        where: {
          id: suscripcion.id,
        },
        data: {
          estado: EstadoSuscripcionEnum.cancelada,
          siguienteCobroEn: null,
          cancelarAlFinalDelPeriodo: false,
        },
      });

      await tx.eventoStripe.update({
        where: {
          stripeEventId: evento.id,
        },
        data: {
          suscripcionId: suscripcion.id,
        },
      });
    });

    return {
      recibido: true,
      tipo: evento.type,
      suscripcionId: suscripcion.id.toString(),
    };
  }

  private async buscarSuscripcionPorStripeId(stripeSubscriptionId: string) {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: {
        proveedor: ProveedorPagoEnum.stripe,
        proveedorSubscriptionId: stripeSubscriptionId,
      },
      select: {
        id: true,
      },
    });

    if (!suscripcion) {
      throw new NotFoundException('No se encontró la suscripción local de Stripe');
    }

    return suscripcion;
  }
  private obtenerPeriodoDeSuscripcionStripe(suscripcionStripe: Stripe.Subscription): {
    inicio: Date;
    fin: Date;
  } {
    const item = suscripcionStripe.items.data[0];

    if (!item?.current_period_start || !item.current_period_end) {
      throw new BadRequestException('La suscripción Stripe no contiene periodo de facturación');
    }

    return {
      inicio: new Date(item.current_period_start * 1000),
      fin: new Date(item.current_period_end * 1000),
    };
  }

  private obtenerSuscripcionStripeDesdeFactura(invoice: Stripe.Invoice): string | null {
    return this.obtenerIdSuscripcionStripe(invoice.parent?.subscription_details?.subscription);
  }

  private obtenerBigIntDesdeMetadata(valor: string | undefined): bigint {
    if (!valor) {
      throw new BadRequestException('La sesión Stripe no contiene metadata interna');
    }

    try {
      return BigInt(valor);
    } catch {
      throw new BadRequestException('La metadata de Stripe contiene un ID inválido');
    }
  }

  private obtenerIdStripe(valor: string | { id: string } | null | undefined): string | null {
    if (!valor) {
      return null;
    }

    return typeof valor === 'string' ? valor : valor.id;
  }

  private obtenerIdSuscripcionStripe(
    valor: string | Stripe.Subscription | null | undefined,
  ): string | null {
    if (!valor) {
      return null;
    }

    return typeof valor === 'string' ? valor : valor.id;
  }
}
