import { IsInt, Min, Max, IsUUID, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsAfterOrEqualTo, IsTodayOrFutureDate } from '../../../common/decorators';
import { RUTINAS_VALIDATION_ERRORS } from '../errors/rutinas-validation-errors';

export class AsignarRutinaDto {
  /** ID (UUID v4) del alumno al que se asigna la rutina. */
  @ApiProperty({
    description: 'ID (UUID v4) del alumno al que se asigna la rutina.',
    example: 'a12e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: RUTINAS_VALIDATION_ERRORS.INVALID_ALUMNO_ID })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ALUMNO_ID })
  id_alumno!: string;

  /** Número de día de la semana (1 a 7, donde 1 = lunes). */
  @ApiProperty({
    description: 'Número de día de la semana (1 a 7, donde 1 = lunes).',
    example: 1,
    minimum: 1,
    maximum: 7,
  })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_NUMERO_DIA })
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_NUMERO_DIA })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.NUMERO_DIA_TOO_LOW })
  @Max(7, { message: RUTINAS_VALIDATION_ERRORS.NUMERO_DIA_TOO_HIGH })
  numero_dia!: number;

  /** Fecha de inicio de la asignación en formato ISO (aaaa-mm-dd). Debe ser hoy o futura. */
  @ApiProperty({
    description:
      'Fecha de inicio de la asignación en formato ISO (aaaa-mm-dd). Debe ser hoy o futura.',
    example: '2026-09-14',
  })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_FECHA_INICIO })
  @IsDateString({}, { message: RUTINAS_VALIDATION_ERRORS.INVALID_FECHA_INICIO })
  @IsTodayOrFutureDate({
    message: RUTINAS_VALIDATION_ERRORS.FECHA_INICIO_NOT_TODAY_OR_FUTURE,
  })
  fecha_inicio!: string;

  /** Fecha de fin de la asignación en formato ISO (aaaa-mm-dd). Debe ser posterior o igual a `fecha_inicio`. */
  @ApiProperty({
    description:
      'Fecha de fin de la asignación en formato ISO (aaaa-mm-dd). Debe ser posterior o igual a fecha_inicio.',
    example: '2026-12-14',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: RUTINAS_VALIDATION_ERRORS.INVALID_FECHA_FIN })
  @IsAfterOrEqualTo('fecha_inicio', {
    message: RUTINAS_VALIDATION_ERRORS.FECHA_FIN_BEFORE_FECHA_INICIO,
  })
  fecha_fin?: string;
}
