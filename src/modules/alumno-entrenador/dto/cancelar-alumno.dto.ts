import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../../../common/exception/errors/alumno-entrenador-validation-errors';

export class CancelarAlumnoDto {
  @IsUUID(undefined, {
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_ID_ENTRENADOR,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_ID_ENTRENADOR,
  })
  id_entrenador!: string;

  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ENTRENADOR,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ENTRENADOR,
  })
  contraseña_entrenador!: string;
}
