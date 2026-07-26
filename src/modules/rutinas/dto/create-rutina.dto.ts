import { IsInt, IsNotEmpty, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRutinaDto {
  @IsUUID('4', { message: 'created_by_usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'created_by_usuario es obligatorio' })
  created_by_usuario!: string;

  @IsString({ message: 'nombre debe ser texto' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  @MaxLength(100, { message: 'nombre no puede exceder 100 caracteres' })
  nombre!: string;

  @IsString({ message: 'descripcion debe ser texto' })
  @IsNotEmpty({ message: 'descripcion es obligatoria' })
  @MaxLength(1000, { message: 'descripcion no puede exceder 1000 caracteres' })
  descripcion!: string;

  @Type(() => Number)
  @IsInt({ message: 'id_categoria_rutina debe ser un entero' })
  @Min(1, { message: 'id_categoria_rutina debe ser mayor a 0' })
  id_categoria_rutina!: number;
}
