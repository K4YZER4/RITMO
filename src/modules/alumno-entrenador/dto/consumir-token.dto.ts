import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../../../common/exception/errors/alumno-entrenador-validation-errors';

export class ConsumirTokenDto {
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CODIGO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CODIGO,
  })
  codigo!: string;

  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_SECRETO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_SECRETO,
  })
  secreto!: string;

  @IsUUID(undefined, {
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_ID_ENTRENADOR,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_ID_ENTRENADOR,
  })
  id_entrenador!: string;
}
