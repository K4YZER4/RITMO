import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoPagoEnum, EstadoSuscripcionEnum } from '@prisma/client';

import { ActualizarSuscripcionPorPagoHandler } from './actualizar-suscripcion-por-pago.handler';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ActualizarSuscripcionPorPagoHandler', () => {
  let handler: ActualizarSuscripcionPorPagoHandler;
  let prismaMock: {
    $transaction: jest.Mock;
  };

  const txMock = {
    pago: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    suscripcion: {
      update: jest.fn(),
    },
  };

  const periodoInicio = new Date('2026-09-01T00:00:00.000Z');
  const periodoFin = new Date('2026-10-01T00:00:00.000Z');

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock = {
      $transaction: jest.fn((cb: unknown) => cb(txMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActualizarSuscripcionPorPagoHandler,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    handler = module.get<ActualizarSuscripcionPorPagoHandler>(ActualizarSuscripcionPorPagoHandler);
  });

  describe('activarPorPagoConfirmado', () => {
    it('debe marcar el pago como pagado y activar la suscripción', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoPagoEnum.pendiente,
        suscripcionId: BigInt(10),
      });

      await handler.activarPorPagoConfirmado(BigInt(1), periodoInicio, periodoFin, periodoFin);

      expect(txMock.pago.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          estado: EstadoPagoEnum.pagado,
          pagadoEn: expect.any(Date),
          venceEn: periodoFin,
        },
      });
      expect(txMock.suscripcion.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: {
          estado: EstadoSuscripcionEnum.activa,
          periodoActualInicio: periodoInicio,
          periodoActualFin: periodoFin,
          siguienteCobroEn: periodoFin,
        },
      });
    });

    it('debe ser no-op si el pago ya está pagado', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoPagoEnum.pagado,
        suscripcionId: BigInt(10),
      });

      await handler.activarPorPagoConfirmado(BigInt(1), periodoInicio, periodoFin, null);

      expect(txMock.pago.update).not.toHaveBeenCalled();
      expect(txMock.suscripcion.update).not.toHaveBeenCalled();
    });

    it('debe poder recuperar un pago fallido y activar la suscripción', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoPagoEnum.fallido,
        suscripcionId: BigInt(10),
      });

      await handler.activarPorPagoConfirmado(BigInt(1), periodoInicio, periodoFin, null);

      expect(txMock.pago.update).toHaveBeenCalled();
      expect(txMock.suscripcion.update).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el pago no existe', async () => {
      txMock.pago.findUnique.mockResolvedValue(null);

      await expect(
        handler.activarPorPagoConfirmado(BigInt(1), periodoInicio, periodoFin, null),
      ).rejects.toThrow(new NotFoundException('Pago no encontrado'));
    });

    it('debe lanzar BadRequestException si el pago está cancelado', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(1),
        estado: EstadoPagoEnum.cancelado,
        suscripcionId: BigInt(10),
      });

      await expect(
        handler.activarPorPagoConfirmado(BigInt(1), periodoInicio, periodoFin, null),
      ).rejects.toThrow(new BadRequestException('El pago no puede confirmarse desde su estado actual'));
    });
  });

  describe('marcarMorosaPorPagoFallido', () => {
    it('debe marcar el pago como fallido y la suscripción como morosa', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(2),
        estado: EstadoPagoEnum.pendiente,
        suscripcionId: BigInt(10),
      });

      await handler.marcarMorosaPorPagoFallido(BigInt(2));

      expect(txMock.pago.update).toHaveBeenCalledWith({
        where: { id: BigInt(2) },
        data: { estado: EstadoPagoEnum.fallido },
      });
      expect(txMock.suscripcion.update).toHaveBeenCalledWith({
        where: { id: BigInt(10) },
        data: { estado: EstadoSuscripcionEnum.morosa },
      });
    });

    it('debe ser no-op si el pago ya está pagado', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(2),
        estado: EstadoPagoEnum.pagado,
        suscripcionId: BigInt(10),
      });

      await handler.marcarMorosaPorPagoFallido(BigInt(2));

      expect(txMock.pago.update).not.toHaveBeenCalled();
      expect(txMock.suscripcion.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el pago está reembolsado', async () => {
      txMock.pago.findUnique.mockResolvedValue({
        id: BigInt(2),
        estado: EstadoPagoEnum.reembolsado,
        suscripcionId: BigInt(10),
      });

      await expect(handler.marcarMorosaPorPagoFallido(BigInt(2))).rejects.toThrow(
        new BadRequestException('El pago no puede marcarse como fallido desde su estado actual'),
      );
    });

    it('debe lanzar NotFoundException si el pago no existe', async () => {
      txMock.pago.findUnique.mockResolvedValue(null);

      await expect(handler.marcarMorosaPorPagoFallido(BigInt(2))).rejects.toThrow(
        new NotFoundException('Pago no encontrado'),
      );
    });
  });
});