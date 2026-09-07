import { IsNotEmpty, IsString } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class CancelarMiEntrenadorDto {
  /** Contraseña del alumno para confirmar la desvinculación. */
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ALUMNO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ALUMNO,
  })
  contraseña_alumno!: string;
}
