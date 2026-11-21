import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReordenarAsignacionItemDto {
  @IsNumberString()
  @IsNotEmpty()
  id_usuario_rutina!: string;

  @IsInt()
  @Min(1)
  @Max(7)
  numero_dia!: number;
}

export class ReordenarAsignacionesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReordenarAsignacionItemDto)
  cambios!: ReordenarAsignacionItemDto[];
}
