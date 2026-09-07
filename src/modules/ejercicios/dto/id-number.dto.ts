import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBigInt } from '../../pagos/dto/is-big-int.decorator';
import { ToBigInt } from '../../../common/decorators/to-big-int.decorator';
import { EJERCICIOS_VALIDATION_ERRORS } from '../errors/ejercicios-validation-errors';

export class IdNumberDto {
  @ApiProperty({
    type: String,
    description: 'ID del ejercicio personalizado (bigint serializado como string).',
    example: '123',
  })
  @ToBigInt()
  @IsBigInt({
    message: EJERCICIOS_VALIDATION_ERRORS.INVALID_ID,
  })
  @IsNotEmpty({
    message: EJERCICIOS_VALIDATION_ERRORS.REQUIRED_ID,
  })
  id!: bigint;
}
