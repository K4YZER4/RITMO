import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ExceptionMessages } from '../../../common/exception/exception-messages';
export class loginDto {
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
}
