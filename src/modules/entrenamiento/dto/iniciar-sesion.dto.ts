import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString } from 'class-validator';

export class IniciarSesionDto {
  @ApiProperty({ example: '1', description: 'ID de la asignación de rutina.' })
  @IsNotEmpty()
  @IsNumberString({ no_symbols: true })
  usuario_rutina_id!: string;
}
