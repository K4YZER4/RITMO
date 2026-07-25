import { IsNotEmpty, IsNumber } from 'class-validator';
export class IdNumberDto {
  @IsNumber()
  @IsNotEmpty()
  id!: number;
}
