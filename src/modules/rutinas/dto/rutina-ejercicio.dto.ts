import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RutinaEjercicioAsignacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'id_ejercicio_estandar debe ser un entero' })
  @Min(1, { message: 'id_ejercicio_estandar debe ser mayor a 0' })
  id_ejercicio_estandar?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'id_ejercicio_personalizado debe ser un entero' })
  @Min(1, { message: 'id_ejercicio_personalizado debe ser mayor a 0' })
  id_ejercicio_personalizado?: number;

  @IsNotEmpty({ message: 'orden es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'orden debe ser un entero' })
  @Min(1, { message: 'orden debe ser mayor a 0' })
  orden!: number;

  @IsNotEmpty({ message: 'series es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'series debe ser un entero' })
  @Min(1, { message: 'series debe ser mayor a 0' })
  series!: number;

  @IsNotEmpty({ message: 'repeticiones es obligatorio' })
  @Type(() => Number)
  @IsInt({ message: 'repeticiones debe ser un entero' })
  @Min(1, { message: 'repeticiones debe ser mayor a 0' })
  repeticiones!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'peso_objetivo debe ser un número válido con máximo 2 decimales' },
  )
  @Min(0, { message: 'peso_objetivo no puede ser negativo' })
  peso_objetivo?: number;

  @IsOptional()
  @IsString({ message: 'nota_entrenador debe ser texto' })
  @IsNotEmpty({ message: 'nota_entrenador no debe venir vacío' })
  @MaxLength(1000, { message: 'nota_entrenador no puede exceder 1000 caracteres' })
  nota_entrenador?: string;

  @IsOptional()
  @IsString({ message: 'link_apoyo debe ser texto' })
  @IsNotEmpty({ message: 'link_apoyo no debe venir vacío' })
  @IsUrl(
    { require_protocol: true },
    { message: 'link_apoyo debe ser una URL válida con http o https' },
  )
  @MaxLength(500, { message: 'link_apoyo no puede exceder 500 caracteres' })
  link_apoyo?: string;
}
export class RutinaEjercicioDto {
  @IsArray({ message: 'ejercicios debe ser un arreglo' })
  @ArrayMinSize(1, { message: 'ejercicios debe contener al menos un ejercicio' })
  @ValidateNested({ each: true })
  @Type(() => RutinaEjercicioAsignacionDto)
  ejercicios!: RutinaEjercicioAsignacionDto[];
}
