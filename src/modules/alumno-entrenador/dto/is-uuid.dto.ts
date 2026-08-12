import { IsUUID } from 'class-validator';
export class IsUUIDDto {
  @IsUUID()
  id!: string;
}
