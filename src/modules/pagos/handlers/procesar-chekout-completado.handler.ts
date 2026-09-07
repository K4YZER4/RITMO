import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProveedorPagoEnum } from '@prisma/client';
import type Stripe from 'stripe';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProcesarCheckoutCompletadoHandler {
  constructor(private readonly prisma: PrismaService) {}

  async ejecutar(evento: Stripe.Event) {
    const session = evento.data.object as Stripe.Checkout.Session;

    const pagoId = this.obtenerBigIntDesdeMetadata(session.metadata?.pagoId);

    const suscripcionId = this.obtenerBigIntDesdeMetadata(session.metadata?.suscripcionId);

    const customerId = this.obtenerIdStripe(session.customer);

    const stripeSubscriptionId = this.obtenerIdStripe(session.subscription);

    if (!customerId || !stripeSubscriptionId) {
      throw new BadRequestException('La sesión Stripe no contiene customer o subscription');
    }

    await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({
        where: {
          id: pagoId,
        },
        select: {
          id: true,
          suscripcionId: true,
          proveedorPagoId: true,
        },
      });

      if (!pago) {
        throw new NotFoundException('No se encontró el pago asociado al Checkout');
      }

      if (pago.suscripcionId !== suscripcionId) {
        throw new BadRequestException('El pago no pertenece a la suscripción del Checkout');
      }

      if (pago.proveedorPagoId && pago.proveedorPagoId !== session.id) {
        throw new BadRequestException('La sesión Stripe no coincide con el pago local');
      }

      await tx.pago.update({
        where: {
          id: pago.id,
        },
        data: {
          proveedor: ProveedorPagoEnum.stripe,
          proveedorPagoId: session.id,
        },
      });

      await tx.suscripcion.update({
        where: {
          id: suscripcionId,
        },
        data: {
          proveedor: ProveedorPagoEnum.stripe,
          proveedorCustomerId: customerId,
          proveedorSubscriptionId: stripeSubscriptionId,
        },
      });

      await tx.eventoStripe.update({
        where: {
          stripeEventId: evento.id,
        },
        data: {
          pagoId: pago.id,
          suscripcionId,
        },
      });
    });

    return {
      recibido: true,
      tipo: evento.type,
      pagoId: pagoId.toString(),
      suscripcionId: suscripcionId.toString(),
    };
  }

  private obtenerBigIntDesdeMetadata(valor?: string): bigint {
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
}
