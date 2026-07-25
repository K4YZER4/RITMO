import { IsUUID, IsNotEmpty } from 'class-validator';
export class DeleteEjercicioDto {
  @IsUUID()
  @IsNotEmpty()
  created_by_usuario!: string;
}
