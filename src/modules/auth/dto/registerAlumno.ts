import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsNumber,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { AUTH_VALIDATION_ERRORS } from '../../../common/exception/errors/auth-validation-errors';

export class RegisterAlumnoDto {
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.NAME_TOO_LONG })
  nombre!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_SEX })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_SEX })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.SEX_TOO_LONG })
  sexo!: 'MASCULINO' | 'FEMENINO';

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

  @IsUUID('4', { message: AUTH_VALIDATION_ERRORS.INVALID_TRAINER_ID })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_TRAINER_ID })
  @IsOptional()
  id_entrenador_actual!: string;

  @IsNumber({}, { message: AUTH_VALIDATION_ERRORS.INVALID_PHONE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PHONE })
  numero_celular!: number;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_TRAINING_START_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_TRAINING_START_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_TRAINING_START_DATE })
  fecha_inicio_entrenamiento!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_GOAL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_GOAL })
  objetivo!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_ACTIVITY_LEVEL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_ACTIVITY_LEVEL })
  nivel_actividad!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_MEDICAL_NOTES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_MEDICAL_NOTES })
  observaciones_medicas!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_CURRENT_INJURIES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_CURRENT_INJURIES })
  lesiones_actuales!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PAST_INJURIES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PAST_INJURIES })
  lesiones_pasadas!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_EMERGENCY_CONTACT_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMERGENCY_CONTACT_NAME })
  contacto_emergencia_nombre!: string;

  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_EMERGENCY_CONTACT_PHONE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMERGENCY_CONTACT_PHONE })
  contacto_emergencia_telefono!: string;
}
