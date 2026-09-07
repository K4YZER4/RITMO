import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsBigInt } from '../../pagos/dto/is-big-int.decorator';
import { ToBigInt } from '../../../common/decorators/to-big-int.decorator';
import { RUTINAS_VALIDATION_ERRORS } from '../errors/rutinas-validation-errors';
import { RutinaEjercicioConReferenciaConstraint } from '../validators/rutina-ejercicio-con-referencia.constraint';

export class RutinaEjercicioAsignacionDto {
  @ApiProperty({
    type: String,
    description: 'ID del ejercicio estándar (bigint como string).',
    example: '456',
    required: false,
  })
  @IsOptional()
  @ToBigInt()
  @IsBigInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ID_EJERCICIO_ESTANDAR })
  id_ejercicio_estandar?: bigint;

  @ApiProperty({
    type: String,
    description: 'ID del ejercicio personalizado (bigint como string).',
    example: '123',
    required: false,
  })
  @IsOptional()
  @ToBigInt()
  @IsBigInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ID_EJERCICIO_PERSONALIZADO })
  id_ejercicio_personalizado?: bigint;

  /** Orden del ejercicio dentro de la rutina (mínimo 1). */
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ORDEN })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ORDEN })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.ORDEN_TOO_LOW })
  orden!: number;

  /** Número de series del ejercicio (mínimo 1). */
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_SERIES })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_SERIES })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.SERIES_TOO_LOW })
  series!: number;

  /** Número de repeticiones por serie (mínimo 1). */
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_REPETICIONES })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_REPETICIONES })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.REPETICIONES_TOO_LOW })
  repeticiones!: number;

  /** Peso objetivo en kg (hasta 2 decimales, mínimo 0). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: RUTINAS_VALIDATION_ERRORS.INVALID_PESO_OBJETIVO })
  @Min(0, { message: RUTINAS_VALIDATION_ERRORS.PESO_OBJETIVO_TOO_LOW })
  peso_objetivo?: number;

  /** Nota del entrenador (máximo 1000 caracteres). */
  @IsOptional()
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_NOTA_ENTRENADOR })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.EMPTY_NOTA_ENTRENADOR })
  @MaxLength(1000, { message: RUTINAS_VALIDATION_ERRORS.NOTA_ENTRENADOR_TOO_LONG })
  nota_entrenador?: string;

  /** URL de apoyo para el ejercicio (máximo 500 caracteres). */
  @IsOptional()
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_LINK_APOYO_TYPE })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.EMPTY_LINK_APOYO })
  @IsUrl({ require_protocol: true }, { message: RUTINAS_VALIDATION_ERRORS.INVALID_LINK_APOYO })
  @MaxLength(500, { message: RUTINAS_VALIDATION_ERRORS.LINK_APOYO_TOO_LONG })
  link_apoyo?: string;
}

export class RutinaEjercicioDto {
  /** Lista de ejercicios a asignar a la rutina (mínimo 1). */
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_EJERCICIOS })
  @IsArray({ message: RUTINAS_VALIDATION_ERRORS.INVALID_EJERCICIOS })
  @ArrayMinSize(1, { message: RUTINAS_VALIDATION_ERRORS.EJERCICIOS_MIN_SIZE })
  @Validate(RutinaEjercicioConReferenciaConstraint, {
    each: true,
    message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ID_EJERCICIO,
  })
  @ValidateNested({ each: true })
  @Type(() => RutinaEjercicioAsignacionDto)
  ejercicios!: RutinaEjercicioAsignacionDto[];
}
