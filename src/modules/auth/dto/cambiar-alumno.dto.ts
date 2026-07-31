import { IsUUID, IsNotEmpty, IsString, IsEmail } from 'class-validator';

export class CambiarAlumnoDto {
  @IsUUID()
  idAlumno!: string;
  @IsUUID()
  idEntrenador!: string;
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  correo_alumno!: string;
  @IsNotEmpty()
  @IsString()
  constraseña_alumno!: string;
}
