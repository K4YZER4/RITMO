import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
  IsNumberString,
} from 'class-validator';

export class ActualizarAsignacionDto {
  @IsNumberString()
  @IsNotEmpty()
  id_rutina!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  numero_dia!: number;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio!: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;
}
