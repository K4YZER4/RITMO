import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBigInt } from './is-big-int.decorator';
import { ToBigInt } from '../../../common/decorators/to-big-int.decorator';
import { PAGOS_VALIDATION_ERRORS } from '../errors/pagos-validation-errors';

export class CrearCheckoutDto {
  @ApiProperty({
    type: String,
    description: 'ID del pago pendiente (bigint como string).',
    example: '123',
  })
  @ToBigInt()
  @IsNotEmpty({ message: PAGOS_VALIDATION_ERRORS.REQUIRED_PAGO_ID })
  @IsBigInt({ message: PAGOS_VALIDATION_ERRORS.INVALID_PAGO_ID })
  pagoId!: bigint;

  @ApiProperty({
    type: String,
    description: 'ID de la suscripción asociada al pago (bigint como string).',
    example: '456',
  })
  @ToBigInt()
  @IsNotEmpty({ message: PAGOS_VALIDATION_ERRORS.REQUIRED_SUSCRIPCION_ID })
  @IsBigInt({ message: PAGOS_VALIDATION_ERRORS.INVALID_SUSCRIPCION_ID })
  suscripcionId!: bigint;
}
