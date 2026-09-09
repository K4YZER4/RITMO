import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MODOS_CAMBIO_PLAN } from '../../../common/constants/modo-cambio';
import { SUSCRIPCIONES_VALIDATION_ERRORS } from '../errors/suscripciones-validation-errors';

export class CambiarPlanDto {
  /** ID del nuevo plan al que se desea migrar (mínimo 1). */
  @ApiProperty({
    description: 'ID del nuevo plan al que se desea migrar.',
    example: 2,
    minimum: 1,
    required: true,
  })
  @Type(() => Number)
  @IsNotEmpty({ message: SUSCRIPCIONES_VALIDATION_ERRORS.REQUIRED_ID_PLAN_NUEVO })
  @IsInt({ message: SUSCRIPCIONES_VALIDATION_ERRORS.INVALID_ID_PLAN_NUEVO })
  @Min(1, { message: SUSCRIPCIONES_VALIDATION_ERRORS.ID_PLAN_NUEVO_TOO_LOW })
  idPlanNuevo!: number;

  /** Cómo se aplica el cambio: inmediato o al terminar el periodo pagado. */
  @ApiProperty({
    description:
      'Modo de cambio. "instantaneo" cancela la suscripción Stripe y cobra el nuevo plan de inmediato. "finalPeriodo" aplica el cambio al terminar el periodo ya pagado.',
    enum: Object.values(MODOS_CAMBIO_PLAN),
    example: 'finalPeriodo',
    required: true,
  })
  @IsNotEmpty({ message: SUSCRIPCIONES_VALIDATION_ERRORS.REQUIRED_MODO_CAMBIO })
  @IsIn(Object.values(MODOS_CAMBIO_PLAN), {
    message: SUSCRIPCIONES_VALIDATION_ERRORS.INVALID_MODO_CAMBIO,
  })
  modoCambio!: (typeof MODOS_CAMBIO_PLAN)[keyof typeof MODOS_CAMBIO_PLAN];
}