import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ActualizarSetDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  repeticiones?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  peso?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  rir?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10)
  rpe?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  descanso_segundos?: number;

  @IsOptional()
  @IsBoolean()
  completado?: boolean;
}
