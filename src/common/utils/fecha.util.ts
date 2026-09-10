import { BadRequestException } from '@nestjs/common';
import { UnidadPeriodoEnum } from '@prisma/client';

export function sumarUnidadCalendar(
  inicio: Date,
  cantidad: number,
  unidad: UnidadPeriodoEnum | null,
): Date {
  if (!unidad) {
    throw new BadRequestException('Unidad de duración no válida');
  }

  const resultado = new Date(inicio);

  switch (unidad) {
    case UnidadPeriodoEnum.dia:
      resultado.setDate(resultado.getDate() + cantidad);
      return resultado;

    case UnidadPeriodoEnum.semana:
      resultado.setDate(resultado.getDate() + cantidad * 7);
      return resultado;

    case UnidadPeriodoEnum.mes: {
      const dia = resultado.getDate();

      resultado.setDate(1);
      resultado.setMonth(resultado.getMonth() + cantidad);

      const ultimoDiaMesDestino = new Date(
        resultado.getFullYear(),
        resultado.getMonth() + 1,
        0,
      ).getDate();

      resultado.setDate(Math.min(dia, ultimoDiaMesDestino));

      return resultado;
    }

    case UnidadPeriodoEnum.año:
      resultado.setFullYear(resultado.getFullYear() + cantidad);
      return resultado;

    default:
      throw new BadRequestException('Unidad de duración no válida');
  }
}