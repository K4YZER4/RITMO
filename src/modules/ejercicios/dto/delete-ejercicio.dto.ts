import { IsNotEmpty, IsUUID } from 'class-validator';
import { EJERCICIOS_VALIDATION_ERRORS } from '../../../common/exception/errors/ejercicios-validation-errors';

export class DeleteEjercicioDto {
  @IsUUID(undefined, {
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_CREATED_BY_USUARIO,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_CREATED_BY_USUARIO,
  })
  created_by_usuario!: string;
}
