import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ALUMNO_ENTRENADOR_VALIDATION_ERRORS } from '../errors/alumno-entrenador-validation-errors';

export class IsUUIDDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'ID (UUID) del alumno.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(undefined, {
    message: ALUMNO_ENTRENADOR_VALIDATION_ERRORS.INVALID_ID_ALUMNO,
  })
  id!: string;
}
