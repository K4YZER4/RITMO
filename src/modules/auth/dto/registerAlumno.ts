import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsDateString,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { ExceptionMessages } from '../../../common/exception/exception-messages';
export class registerAlumnoDto {
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

  @IsUUID()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.ID_ENTRENADOR_VACIO })
  id_entrenador_actual!: string;

  @IsNumber()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.NUMERO_CELULAR_VACIO })
  numero_celular!: number;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.FECHA_INICIO_ENTRENAMIENTO_VACIA })
  @IsDateString()
  fecha_inicio_entrenamiento!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.OBJETIVO_VACIO })
  objetivo!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.NIVEL_ACTIVIDAD_VACIO })
  nivel_actividad!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.OBSERVACIONES_MEDICAS_VACIAS })
  observaciones_medicas!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.LESIONES_ACTUALES_VACIAS })
  lesiones_actuales!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.LESIONES_PASADAS_VACIAS })
  lesiones_pasadas!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.CONTACTO_EMERGENCIA_NOMBRE_VACIO })
  contacto_emergencia_nombre!: string;

  @IsString()
  @IsNotEmpty({ message: ExceptionMessages.dictionary.CONTACTO_EMERGENCIA_TELEFONO_VACIO })
  contacto_emergencia_telefono!: string;
}
