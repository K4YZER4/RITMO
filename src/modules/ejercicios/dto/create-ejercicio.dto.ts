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
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EJERCICIOS_VALIDATION_ERRORS } from '../../../common/exception/errors/ejercicios-validation-errors';

export class CreateEjercicioPersonalizadoDto {
  @IsUUID(undefined, {
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_CREATED_BY_USUARIO,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_CREATED_BY_USUARIO,
  })
  created_by_usuario!: string;

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

  @IsOptional()
  @IsBoolean({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_ACTIVA,
  })
  activa?: boolean;

  @IsOptional()
  @IsString({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_DESCRIPCION,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_DESCRIPCION,
  })
  descripcion?: string;

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
