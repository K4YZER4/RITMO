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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RUTINAS_VALIDATION_ERRORS } from '../../../common/exception/errors/rutinas-validation-errors';

class RutinaEjercicioAsignacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ID_EJERCICIO_ESTANDAR })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.ID_EJERCICIO_ESTANDAR_TOO_LOW })
  id_ejercicio_estandar?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ID_EJERCICIO_PERSONALIZADO })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.ID_EJERCICIO_PERSONALIZADO_TOO_LOW })
  id_ejercicio_personalizado?: number;

  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ORDEN })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_ORDEN })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.ORDEN_TOO_LOW })
  orden!: number;

  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_SERIES })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_SERIES })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.SERIES_TOO_LOW })
  series!: number;

  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_REPETICIONES })
  @Type(() => Number)
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_REPETICIONES })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.REPETICIONES_TOO_LOW })
  repeticiones!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: RUTINAS_VALIDATION_ERRORS.INVALID_PESO_OBJETIVO })
  @Min(0, { message: RUTINAS_VALIDATION_ERRORS.PESO_OBJETIVO_TOO_LOW })
  peso_objetivo?: number;

  @IsOptional()
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_NOTA_ENTRENADOR })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.EMPTY_NOTA_ENTRENADOR })
  @MaxLength(1000, { message: RUTINAS_VALIDATION_ERRORS.NOTA_ENTRENADOR_TOO_LONG })
  nota_entrenador?: string;

  @IsOptional()
  @IsString({ message: RUTINAS_VALIDATION_ERRORS.INVALID_LINK_APOYO_TYPE })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.EMPTY_LINK_APOYO })
  @IsUrl({ require_protocol: true }, { message: RUTINAS_VALIDATION_ERRORS.INVALID_LINK_APOYO })
  @MaxLength(500, { message: RUTINAS_VALIDATION_ERRORS.LINK_APOYO_TOO_LONG })
  link_apoyo?: string;
}

export class RutinaEjercicioDto {
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_EJERCICIOS })
  @IsArray({ message: RUTINAS_VALIDATION_ERRORS.INVALID_EJERCICIOS })
  @ArrayMinSize(1, { message: RUTINAS_VALIDATION_ERRORS.EJERCICIOS_MIN_SIZE })
  @ValidateNested({ each: true })
  @Type(() => RutinaEjercicioAsignacionDto)
  ejercicios!: RutinaEjercicioAsignacionDto[];
}
