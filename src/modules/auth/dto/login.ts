import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { AUTH_VALIDATION_ERRORS } from '../../../common/exception/auth-validation-errors';

export class LoginDto {
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
}
