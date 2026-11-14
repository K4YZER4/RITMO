import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class ReordenarDiaDto {
  @IsString()
  id_usuario_rutina!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  numero_dia!: number;
}

export class ReordenarSemanaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReordenarDiaDto)
  dias!: ReordenarDiaDto[];
}
