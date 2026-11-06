import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RUTINAS_VALIDATION_ERRORS } from '../errors/rutinas-validation-errors';

export class CreateRutinaDto {
  /** Nombre de la rutina (máximo 100 caracteres). */
  @ApiProperty({
    description: 'Nombre de la rutina (máximo 100 caracteres).',
    example: 'Rutina de empuje',
    maxLength: 100,
  })
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_RUTINA_NOMBRE })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_RUTINA_NOMBRE })
  @MaxLength(100, { message: RUTINAS_VALIDATION_ERRORS.RUTINA_NOMBRE_TOO_LONG })
  nombre!: string;

  /** Descripción de la rutina (máximo 1000 caracteres). */
  @ApiProperty({
    description: 'Descripción de la rutina (máximo 1000 caracteres).',
    example: 'Rutina de pecho y tríceps.',
    maxLength: 1000,
  })
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_RUTINA_DESCRIPCION })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_RUTINA_DESCRIPCION })
  @MaxLength(1000, { message: RUTINAS_VALIDATION_ERRORS.RUTINA_DESCRIPCION_TOO_LONG })
  descripcion!: string;

  /** ID de la categoría a la que pertenece la rutina (mínimo 1). */
  @ApiProperty({
    description: 'ID de la categoría a la que pertenece la rutina (mínimo 1).',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_CATEGORIA_RUTINA_ID })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_CATEGORIA_RUTINA_ID })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.CATEGORIA_RUTINA_ID_TOO_LOW })
  id_categoria_rutina!: number;
}
