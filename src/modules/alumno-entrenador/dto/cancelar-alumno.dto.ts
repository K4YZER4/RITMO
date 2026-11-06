import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class CancelarAlumnoDto {
  /** Contraseña del entrenador para confirmar la cancelación. */
  @ApiProperty({
    description: 'Contraseña del entrenador para confirmar la cancelación.',
    example: 'password-secreta',
  })
  @IsString({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_CONTRASEÑA_ENTRENADOR,
  })
  @IsNotEmpty({
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.REQUIRED_CONTRASEÑA_ENTRENADOR,
  })
  contraseña_entrenador!: string;
}
