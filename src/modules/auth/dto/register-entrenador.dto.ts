import { IsNotEmpty, IsEmail, IsString, MaxLength, MinLength, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_VALIDATION_ERRORS } from '../errors/auth-validation-errors';

export class RegisterEntrenadorDto {
  /** Nombre del entrenador (mínimo 2 caracteres). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_LONG })
  nombre!: string;

  @ApiProperty({
    description: 'Sexo del usuario.',
    enum: ['MASCULINO', 'FEMENINO'],
    example: 'MASCULINO',
  })
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_SEX })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_SEX })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_LONG })
  sexo!: 'MASCULINO' | 'FEMENINO';

  /** Apellido paterno del entrenador. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_LONG })
  apellido_paterno!: string;

  /** Apellido materno del entrenador. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_MOTHER_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_MOTHER_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_LONG })
  apellido_materno!: string;

  /** Correo electrónico del entrenador. */
  @IsEmail({}, { message: AUTH_VALIDATION_ERRORS.INVALID_EMAIL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMAIL })
  @MinLength(5, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_LONG })
  correo!: string;

  /** Contraseña del entrenador (mínimo 8 caracteres). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PASSWORD_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PASSWORD })
  @MinLength(8, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_LONG })
  password!: string;

  /** Fecha de nacimiento en formato ISO (aaaa-mm-dd). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_BIRTH_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_BIRTH_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_BIRTH_DATE })
  fecha_nacimiento!: string;

  /** Nombre público del entrenador (visible para los alumnos). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PUBLIC_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PUBLIC_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.PUBLIC_NAME_TOO_SHORT })
  @MaxLength(50, { message: AUTH_VALIDATION_ERRORS.PUBLIC_NAME_TOO_LONG })
  nombre_publico!: string;

  /** Fecha en la que se convirtió en entrenador, formato ISO (aaaa-mm-dd). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_TRAINER_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_TRAINER_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_TRAINER_DATE })
  fecha_entrenador!: string;
}
