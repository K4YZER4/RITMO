import { IsInt, Min, Max, IsUUID, IsDateString } from 'class-validator';

export class AsignarRutinaDto {
  @IsUUID()
  id_alumno!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  numero_dia!: number;
  @IsUUID()
  asignada_por_usuario!: string;
  @IsDateString()
  fecha_inicio?: string;
  @IsDateString()
  fecha_fin?: string;
}
