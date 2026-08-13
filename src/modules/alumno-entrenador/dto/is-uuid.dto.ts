import { IsNotEmpty, IsUUID } from 'class-validator';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../../../common/exception/errors/alumno-entrenador-validation-errors';

export class IsUUIDDto {
  @IsUUID(undefined, {
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_ID_ALUMNO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_ID_ALUMNO,
  })
  id!: string;
}
