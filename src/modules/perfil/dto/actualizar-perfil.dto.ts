import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  apellido_paterno?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  apellido_materno?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre_publico?: string;
}
