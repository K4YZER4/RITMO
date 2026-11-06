import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class ConsumirTokenDto {
  /** Código del token de vinculación generado por el alumno. */
  @ApiProperty({
    description: 'Código del token de vinculación generado por el alumno.',
    example: 'RITMO-ABC123',
  })
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CODIGO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CODIGO,
  })
  codigo!: string;

  /** Secreto del token de vinculación generado por el alumno. */
  @ApiProperty({
    description: 'Secreto del token de vinculación generado por el alumno.',
    example: 'g7f3K9xP2mZq8Lw4',
  })
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_SECRETO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_SECRETO,
  })
  secreto!: string;
}
