import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPagoEnum, EstadoSuscripcionEnum } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ActualizarSuscripcionPorPagoHandler {
  constructor(private readonly prisma: PrismaService) {}

  async activarPorPagoConfirmado(
    pagoId: bigint,
    periodoInicio: Date,
    periodoFin: Date,
    siguienteCobroEn: Date | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({
        where: {
          id: pagoId,
        },
        select: {
          id: true,
          estado: true,
          suscripcionId: true,
        },
      });

      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pago.estado === EstadoPagoEnum.pagado) {
        return;
      }

      if (pago.estado !== EstadoPagoEnum.pendiente && pago.estado !== EstadoPagoEnum.fallido) {
        throw new BadRequestException('El pago no puede confirmarse desde su estado actual');
      }

      await tx.pago.update({
        where: {
          id: pago.id,
        },
        data: {
          estado: EstadoPagoEnum.pagado,
          pagadoEn: new Date(),
          venceEn: periodoFin,
        },
      });

      await tx.suscripcion.update({
        where: {
          id: pago.suscripcionId,
        },
        data: {
          estado: EstadoSuscripcionEnum.activa,
          periodoActualInicio: periodoInicio,
          periodoActualFin: periodoFin,
          siguienteCobroEn,
        },
      });
    });
  }

  async marcarMorosaPorPagoFallido(pagoId: bigint): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pago.findUnique({
        where: {
          id: pagoId,
        },
        select: {
          id: true,
          estado: true,
          suscripcionId: true,
        },
      });

      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pago.estado === EstadoPagoEnum.pagado) {
        return;
      }

      if (pago.estado === EstadoPagoEnum.cancelado || pago.estado === EstadoPagoEnum.reembolsado) {
        throw new BadRequestException(
          'El pago no puede marcarse como fallido desde su estado actual',
        );
      }

      await tx.pago.update({
        where: {
          id: pago.id,
        },
        data: {
          estado: EstadoPagoEnum.fallido,
        },
      });

      await tx.suscripcion.update({
        where: {
          id: pago.suscripcionId,
        },
        data: {
          estado: EstadoSuscripcionEnum.morosa,
        },
      });
    });
  }
}
