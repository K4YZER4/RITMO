import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones_medicas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lesiones_actuales?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  lesiones_pasadas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contacto_emergencia_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contacto_emergencia_telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  numero_celular?: string;

  @IsOptional()
  @IsInt()
  id_objetivo?: number;

  @IsOptional()
  @IsInt()
  id_nivel_actividad?: number;
}
