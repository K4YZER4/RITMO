import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarNotaEjercicioDto {
  @ApiPropertyOptional({
    description:
      'Nota técnica, molestia física o retroalimentación sobre el ejercicio en la sesión activa',
    example:
      'Ligera molestia en el tendón rotuliano al romper paralelo. Bajar 5kg la próxima sesión.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La nota debe ser una cadena de texto' })
  @MaxLength(500, { message: 'La nota no puede superar los 500 caracteres' })
  nota?: string;
}
