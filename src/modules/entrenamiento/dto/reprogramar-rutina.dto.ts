import { IsInt, IsString, Max, Min } from 'class-validator';

export class ReprogramarRutinaDto {
  @IsString()
  id_usuario_rutina!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  numero_dia!: number;
}
