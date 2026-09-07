import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AUTH_VALIDATION_ERRORS } from '../errors/auth-validation-errors';

export class RegisterAlumnoDto {
  /** Nombre del alumno (mínimo 2 caracteres). */
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

  /** Apellido paterno del alumno. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.LAST_NAME_TOO_LONG })
  apellido_paterno!: string;

  /** Apellido materno del alumno. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_MOTHER_LAST_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_MOTHER_LAST_NAME })
  @MinLength(2, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_SHORT })
  @MaxLength(20, { message: AUTH_VALIDATION_ERRORS.MOTHER_LAST_NAME_TOO_LONG })
  apellido_materno!: string;

  /** Correo electrónico del alumno. */
  @IsEmail({}, { message: AUTH_VALIDATION_ERRORS.INVALID_EMAIL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMAIL })
  @MinLength(5, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_SHORT })
  @MaxLength(60, { message: AUTH_VALIDATION_ERRORS.EMAIL_TOO_LONG })
  correo!: string;

  /** Contraseña del alumno (mínimo 8 caracteres). */
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

  /** Número de celular del alumno. */
  @IsNumber({}, { message: AUTH_VALIDATION_ERRORS.INVALID_PHONE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PHONE })
  numero_celular!: number;

  /** Fecha de inicio del entrenamiento en formato ISO (aaaa-mm-dd). */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_TRAINING_START_DATE_TYPE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_TRAINING_START_DATE })
  @IsDateString({}, { message: AUTH_VALIDATION_ERRORS.INVALID_TRAINING_START_DATE })
  fecha_inicio_entrenamiento!: string;

  /** ID del objetivo del alumno. */
  @IsNumber({}, { message: AUTH_VALIDATION_ERRORS.INVALID_GOAL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_GOAL })
  id_objetivo!: number;

  /** ID del nivel de actividad del alumno. */
  @IsNumber({}, { message: AUTH_VALIDATION_ERRORS.INVALID_ACTIVITY_LEVEL })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_ACTIVITY_LEVEL })
  id_nivel_actividad!: number;

  /** Observaciones médicas del alumno. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_MEDICAL_NOTES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_MEDICAL_NOTES })
  observaciones_medicas!: string;

  /** Lesiones actuales del alumno. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_CURRENT_INJURIES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_CURRENT_INJURIES })
  lesiones_actuales!: string;

  /** Lesiones pasadas del alumno. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_PAST_INJURIES })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_PAST_INJURIES })
  lesiones_pasadas!: string;

  /** Nombre del contacto de emergencia. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_EMERGENCY_CONTACT_NAME })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMERGENCY_CONTACT_NAME })
  contacto_emergencia_nombre!: string;

  /** Teléfono del contacto de emergencia. */
  @IsString({ message: AUTH_VALIDATION_ERRORS.INVALID_EMERGENCY_CONTACT_PHONE })
  @IsNotEmpty({ message: AUTH_VALIDATION_ERRORS.REQUIRED_EMERGENCY_CONTACT_PHONE })
  contacto_emergencia_telefono!: string;
}
