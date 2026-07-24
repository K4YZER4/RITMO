import { IsUUID, IsInt, IsNotEmpty } from 'class-validator';
export class DeleteEjercicioDto {
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @IsUUID()
  @IsNotEmpty()
  created_by_usuario!: string;
}
