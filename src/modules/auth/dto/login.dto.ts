import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_VALIDATION_ERRORS } from '../errors/auth-validation-errors';

export class LoginDto {
  /** Correo electrónico del usuario. */
  @ApiProperty({
    description: 'Correo electrónico del usuario.',
    example: 'ana@test.com',
    maxLength: 60,
  })
  @IsEmail({}, { message: AUTH_VALIDATION_ERRORS.INVALID_EMAIL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMAIL })
  @MinLength(5, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_LONG })
  correo!: string;

  /** Contraseña del usuario (mínimo 8 caracteres). */
  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 8 caracteres).',
    example: 'password-secreta',
    minLength: 8,
    maxLength: 60,
  })
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PASSWORD_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PASSWORD })
  @MinLength(8, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_LONG })
  password!: string;
}
