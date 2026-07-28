import { IsInt, Min, Max, IsUUID, IsDateString, IsOptional, IsNotEmpty } from 'class-validator';
import { IsAfterOrEqualTo, IsTodayOrFutureDate } from '../../../common/decorators';
import { RUTINAS_VALIDATION_ERRORS } from '../../../common/exception/errors/rutinas-validation-errors';

export class AsignarRutinaDto {
  @IsUUID('4', { message: RUTINAS_VALIDATION_ERRORS.INVALID_ALUMNO_ID })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ALUMNO_ID })
  id_alumno!: string;

  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_NUMERO_DIA })
  @IsInt({ message: RUTINAS_VALIDATION_ERRORS.INVALID_NUMERO_DIA })
  @Min(1, { message: RUTINAS_VALIDATION_ERRORS.NUMERO_DIA_TOO_LOW })
  @Max(7, { message: RUTINAS_VALIDATION_ERRORS.NUMERO_DIA_TOO_HIGH })
  numero_dia!: number;

  @IsUUID('4', { message: RUTINAS_VALIDATION_ERRORS.INVALID_ASIGNADA_POR_USUARIO })
  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_ASIGNADA_POR_USUARIO })
  asignada_por_usuario!: string;

  @IsNotEmpty({ message: RUTINAS_VALIDATION_ERRORS.REQUIRED_FECHA_INICIO })
  @IsDateString({}, { message: RUTINAS_VALIDATION_ERRORS.INVALID_FECHA_INICIO })
  @IsTodayOrFutureDate({
    message: RUTINAS_VALIDATION_ERRORS.FECHA_INICIO_NOT_TODAY_OR_FUTURE,
  })
  fecha_inicio!: string;

  @IsOptional()
  @IsDateString({}, { message: RUTINAS_VALIDATION_ERRORS.INVALID_FECHA_FIN })
  @IsAfterOrEqualTo('fecha_inicio', {
    message: RUTINAS_VALIDATION_ERRORS.FECHA_FIN_BEFORE_FECHA_INICIO,
  })
  fecha_fin?: string;
}
