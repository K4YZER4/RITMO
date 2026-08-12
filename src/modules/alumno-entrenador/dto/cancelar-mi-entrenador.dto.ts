import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../../../common/exception/errors/alumno-entrenador-validation-errors';

export class CancelarMiEntrenadorDto {
  @IsUUID(undefined, {
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_ID_ALUMNO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_ID_ALUMNO,
  })
  id_alumno!: string;

  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ALUMNO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ALUMNO,
  })
  contraseña_alumno!: string;
}
