import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class FinalizarSesionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  duracion_minutos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
