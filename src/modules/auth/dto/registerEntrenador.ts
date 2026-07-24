import { IsNotEmpty, IsEmail, IsString, MaxLength, MinLength, IsDateString } from 'class-validator';
import { AUTH_VALIDATION_ERRORS } from '../../../common/exception/auth-validation-errors';

export class RegisterEntrenadorDto {
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_LONG })
  nombre!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_SEX })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_SEX })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_LONG })
  sexo!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_LONG })
  apellido_paterno!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_MOTHER_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_MOTHER_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_LONG })
  apellido_materno!: string;

  @IsEmail({}, { message: AUTH_VALIDATION_ERRORS.INVALID_EMAIL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMAIL })
  @MinLength(5, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_LONG })
  correo!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PASSWORD_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PASSWORD })
  @MinLength(8, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.PASSWORD_TOO_LONG })
  password!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_BIRTH_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_BIRTH_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_BIRTH_DATE })
  fecha_nacimiento!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PUBLIC_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PUBLIC_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.PUBLIC_NAME_TOO_SHORT })
  @MaxLength(50, { message: AUTH_VALIDATION_ERRORS.PUBLIC_NAME_TOO_LONG })
  nombre_publico!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_TRAINER_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_TRAINER_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_TRAINER_DATE })
  fecha_entrenador!: string;
}
