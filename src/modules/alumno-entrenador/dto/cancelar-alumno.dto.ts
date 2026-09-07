import { IsString, IsNotEmpty } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class CancelarAlumnoDto {
  /** Contraseña del entrenador para confirmar la cancelación. */
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ENTRENADOR,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ENTRENADOR,
  })
  contraseña_entrenador!: string;
}
