import { IsNotEmpty, IsEmail, IsString, MaxLength, MinLength, IsDateString } from 'class-validator';
import { ExceptionMessages } from '../../../common/exception/exception-messages';
export class registerEntrenadorDto {
  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.NOMBRE_VACIO })
  @MinLength(2)
  @MaxLength(20)
  nombre!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.SEXO_VACIO })
  @MinLength(2)
  @MaxLength(20)
  sexo!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.APELLIDO_PATERNO_VACIO })
  @MinLength(2)
  @MaxLength(20)
  apellido_paterno!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.APELLIDO_MATERNO_VACIO })
  @MinLength(2)
  @MaxLength(20)
  apellido_materno!: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.CORREO_VACIO })
  @MinLength(5)
  @MaxLength(60)
  correo!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.CONTRASENA_VACIA })
  @MinLength(8)
  @MaxLength(60)
  password!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.FECHA_NACIMIENTO_VACIA })
  @IsDateString()
  fecha_nacimiento!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.NOMBRE_PUBLICO_VACIO })
  @MinLength(2)
  @MaxLength(50)
  nombre_publico!: string;
  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.FECHA_ENTRENADOR_VACIA })
  @IsDateString()
  fecha_entrenador!: string;
}
