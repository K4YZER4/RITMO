import { IsNotEmpty, IsString } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class ConsumirTokenDto {
  /** Código del token de vinculación generado por el alumno. */
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CODIGO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CODIGO,
  })
  codigo!: string;

  /** Secreto del token de vinculación generado por el alumno. */
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_SECRETO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_SECRETO,
  })
  secreto!: string;
}
