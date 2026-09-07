import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { SUSCRIPCIONES_VALIDATION_ERRORS } from '../errors/suscripciones-validation-errors';

export class CambiarPlanDto {
  /** ID del nuevo plan al que se desea migrar (mínimo 1). */
  @Type(() => Number)
  @IsNotEmpty({ message: SUSCRIPCIONES_VALIDATION_ERRORS.REQUIRED_ID_PLAN_NUEVO })
  @IsInt({ message: SUSCRIPCIONES_VALIDATION_ERRORS.INVALID_ID_PLAN_NUEVO })
  @Min(1, { message: SUSCRIPCIONES_VALIDATION_ERRORS.ID_PLAN_NUEVO_TOO_LOW })
  idPlanNuevo!: number;
}
