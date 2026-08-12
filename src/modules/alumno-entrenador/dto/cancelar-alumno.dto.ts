import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
export class CancelarAlumnoDto {
  @IsUUID()
  id_entrenador!: string;

  @IsString()
  @IsNotEmpty()
  contraseña_entrenador!: string;
}
