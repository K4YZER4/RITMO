import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { EJERCICIOS_VALIDATION_ERRORS } from '../../../common/exception/errors/ejercicios-validation-errors';

export class IdNumberDto {
  @Type(() => Number)
  @IsInt({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_ID,
  })
  @Min(1, {
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_ID,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_ID,
  })
  id!: number;
}
