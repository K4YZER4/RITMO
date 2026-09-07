import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPagoEnum, Prisma, ProveedorPagoEnum } from '@prisma/client';
import type Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';
import { SuscripcionesService } from '../../suscripciones/suscripciones.service';
import { StripeService } from '../../stripe/stripe.service';

@Injectable()
export class ProcesarFacturaHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly suscripcionesService: SuscripcionesService,
    private readonly stripeService: StripeService,
  ) {}

  async procesarFacturaPagada(evento: Stripe.Event) {
    const invoice = evento.data.object as Stripe.Invoice;

    const stripeSubscriptionId = this.obtenerSuscripcionStripeDesdeFactura(invoice);

    if (!stripeSubscriptionId) {
      throw new BadRequestException('La factura Stripe no tiene una suscripción asociada');
    }

    const suscripcion = await this.buscarSuscripcionPorStripeId(stripeSubscriptionId);

    const pago = await this.obtenerOCrearPagoDesdeFactura({
      suscripcionId: suscripcion.id,
      invoice,
      montoCentavos: invoice.amount_paid,
    });

    const suscripcionStripe = await this.stripeService.obtenerSuscripcion(stripeSubscriptionId);

    const periodo = this.obtenerPeriodoDeSuscripcionStripe(suscripcionStripe);

    await this.suscripcionesService.activarSuscripcionPorPagoConfirmado(
      pago.id,
      periodo.inicio,
      periodo.fin,
      suscripcionStripe.cancel_at_period_end ? null : periodo.fin,
    );

    await this.prisma.eventoStripe.update({
      where: {
        stripeEventId: evento.id,
      },
      data: {
        pagoId: pago.id,
        suscripcionId: suscripcion.id,
      },
    });

    return {
      recibido: true,
      tipo: evento.type,
      pagoId: pago.id.toString(),
      suscripcionId: suscripcion.id.toString(),
    };
  }

  async procesarFacturaFallida(evento: Stripe.Event) {
    const invoice = evento.data.object as Stripe.Invoice;

    const stripeSubscriptionId = this.obtenerSuscripcionStripeDesdeFactura(invoice);

    if (!stripeSubscriptionId) {
      throw new BadRequestException('La factura Stripe no tiene una suscripción asociada');
    }

    const suscripcion = await this.buscarSuscripcionPorStripeId(stripeSubscriptionId);

    const pago = await this.obtenerOCrearPagoDesdeFactura({
      suscripcionId: suscripcion.id,
      invoice,
      montoCentavos: invoice.amount_due,
    });

    await this.suscripcionesService.marcarSuscripcionComoMorosaPorPagoFallido(pago.id);

    await this.prisma.eventoStripe.update({
      where: {
        stripeEventId: evento.id,
      },
      data: {
        pagoId: pago.id,
        suscripcionId: suscripcion.id,
      },
    });

    return {
      recibido: true,
      tipo: evento.type,
      pagoId: pago.id.toString(),
      suscripcionId: suscripcion.id.toString(),
    };
  }

  private async obtenerOCrearPagoDesdeFactura(input: {
    suscripcionId: bigint;
    invoice: Stripe.Invoice;
    montoCentavos: number;
  }) {
    const pagoExistente = await this.prisma.pago.findFirst({
      where: {
        proveedor: ProveedorPagoEnum.stripe,
        proveedorFacturaId: input.invoice.id,
      },
    });

    if (pagoExistente) {
      return pagoExistente;
    }

    if (input.montoCentavos <= 0) {
      throw new BadRequestException('La factura Stripe contiene un monto inválido');
    }

    const monto = new Prisma.Decimal(input.montoCentavos).div(100);

    const pagoPendienteInicial = await this.prisma.pago.findFirst({
      where: {
        suscripcionId: input.suscripcionId,
        proveedor: ProveedorPagoEnum.stripe,
        estado: EstadoPagoEnum.pendiente,
        proveedorFacturaId: null,
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    if (pagoPendienteInicial) {
      return this.prisma.pago.update({
        where: {
          id: pagoPendienteInicial.id,
        },
        data: {
          monto,
          moneda: input.invoice.currency.toUpperCase(),
          proveedorFacturaId: input.invoice.id,
        },
      });
    }

    const venceEn = input.invoice.due_date ? new Date(input.invoice.due_date * 1000) : new Date();

    return this.prisma.pago.create({
      data: {
        suscripcionId: input.suscripcionId,
        monto,
        moneda: input.invoice.currency.toUpperCase(),
        estado: EstadoPagoEnum.pendiente,
        venceEn,
        proveedor: ProveedorPagoEnum.stripe,
        proveedorFacturaId: input.invoice.id,
      },
    });
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

  private obtenerSuscripcionStripeDesdeFactura(invoice: Stripe.Invoice): string | null {
    return this.obtenerIdSuscripcionStripe(invoice.parent?.subscription_details?.subscription);
  }

  private obtenerIdSuscripcionStripe(
    valor: string | Stripe.Subscription | null | undefined,
  ): string | null {
    if (!valor) {
      return null;
    }

    return typeof valor === 'string' ? valor : valor.id;
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
}
