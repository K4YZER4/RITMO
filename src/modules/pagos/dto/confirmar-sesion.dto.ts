import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmarSesionDto {
  @ApiProperty({
    type: String,
    description: 'ID de la sesión de Stripe Checkout (cs_test_...).',
    example: 'cs_test_a1b2c3d4e5f6',
  })
  @IsNotEmpty({ message: 'El sessionId de Stripe es requerido' })
  @IsString({ message: 'El sessionId debe ser una cadena de texto' })
  sessionId!: string;
}
