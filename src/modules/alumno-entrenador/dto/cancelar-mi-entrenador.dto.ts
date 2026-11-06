import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class CancelarMiEntrenadorDto {
  /** Contraseña del alumno para confirmar la desvinculación. */
  @ApiProperty({
    description: 'Contraseña del alumno para confirmar la desvinculación.',
    example: 'password-secreta',
  })
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ALUMNO,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ALUMNO,
  })
  contraseña_alumno!: string;
}
