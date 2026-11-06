import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EJERCICIOS_VALIDATION_ERRORS } from '../errors/ejercicios-validation-errors';

export class CreateEjercicioPersonalizadoDto {
  /** Nombre del ejercicio personalizado (máximo 150 caracteres). */
  @ApiProperty({
    description: 'Nombre del ejercicio personalizado (máximo 150 caracteres).',
    example: 'Prensa de pierna',
    maxLength: 150,
  })
  @IsString({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_NOMBRE,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_NOMBRE,
  })
  @MaxLength(150, {
    message: EJERCICIOS_VALIDATION_ERRORS.NOMBRE_TOO_LONG,
  })
  nombre!: string;

  /** Indica si el ejercicio está activo. Por defecto `true`. */
  @ApiProperty({
    description: 'Indica si el ejercicio está activo. Por defecto true.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_ACTIVA,
  })
  activa?: boolean;

  /** Descripción del ejercicio. */
  @ApiProperty({
    description: 'Descripción del ejercicio.',
    example: 'Ejercicio de cuádriceps y glúteos.',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_DESCRIPCION,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_DESCRIPCION,
  })
  descripcion?: string;

  /** URL de la imagen del ejercicio. */
  @ApiProperty({
    description: 'URL de la imagen del ejercicio.',
    example: 'https://ejemplo.com/prensa.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_URL_IMAGEN_TYPE,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_URL_IMAGEN,
  })
  @IsUrl(
    {},
    {
      message: EJERCICIOS_VALIDATION_ERRORS.INVALID_URL_IMAGEN,
    },
  )
  url_imagen?: string;

  /** URL con información adicional del ejercicio. */
  @ApiProperty({
    description: 'URL con información adicional del ejercicio.',
    example: 'https://ejemplo.com/guia-prensa',
    required: false,
  })
  @IsOptional()
  @IsString({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_LINK_INFORMACION_TYPE,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_LINK_INFORMACION,
  })
  @IsUrl(
    {},
    {
      message: EJERCICIOS_VALIDATION_ERRORS.INVALID_LINK_INFORMACION,
    },
  )
  link_informacion?: string;

  /** IDs de los músculos que trabaja el ejercicio (mínimo 1, sin repetidos). */
  @ApiProperty({
    description: 'IDs de los músculos que trabaja el ejercicio (mínimo 1, sin repetidos).',
    example: [1, 2],
    type: [Number],
  })
  @IsArray({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_MUSCULOS,
  })
  @ArrayNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.EMPTY_MUSCULOS,
  })
  @ArrayMinSize(1, {
    message: EJERCICIOS_VALIDATION_ERRORS.MUSCULOS_MIN_LENGTH,
  })
  @ArrayUnique({
    message: EJERCICIOS_VALIDATION_ERRORS.DUPLICATED_MUSCULOS,
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_MUSCULO_ID,
  })
  musculos!: number[];

  /** IDs de los equipos requeridos para el ejercicio (sin repetidos). */
  @ApiProperty({
    description: 'IDs de los equipos requeridos para el ejercicio (sin repetidos).',
    example: [3],
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_EQUIPOS,
  })
  @ArrayUnique({
    message: EJERCICIOS_VALIDATION_ERRORS.DUPLICATED_EQUIPOS,
  })
  @Type(() => Number)
  @IsInt({
    each: true,
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_EQUIPO_ID,
  })
  equipos?: number[];
}
