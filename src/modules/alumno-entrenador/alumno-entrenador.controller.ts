import { Controller, Put, Post, Body, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AlumnoEntrenadorService } from './alumno-entrenador.service';
import { CancelarAlumnoDto } from './dto/cancelar-alumno.dto';
import { CancelarMiEntrenadorDto } from './dto/cancelar-mi-entrenador.dto';
import { ConsumirTokenDto } from './dto/consumir-token.dto';
import { IsUUIDDto } from './dto/is-uuid.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Alumno-Entrenador')
@ApiBearerAuth('access-token')
@Controller('alumno-entrenador')
export class AlumnoEntrenadorController {
  constructor(private readonly alumnoEntrenadorService: AlumnoEntrenadorService) {}

  @Put('cancelar/mi-entrenador')
  @ApiOperation({
    summary: 'Cancelar mi entrenador',
    description: 'El alumno desvincula a su entrenador actual. Requiere confirmar su contraseña.',
  })
  @ApiOkResponse({
    description: 'Alumno desvinculado de su entrenador exitosamente.',
    schema: {
      example: { success: true, message: 'Alumno desvinculado de su entrenador exitosamente' },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 401, description: 'Alumno no encontrado o contraseña incorrecta.' })
  cancelarMiEntrenador(
    @Body() cancelarData: CancelarMiEntrenadorDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.alumnoEntrenadorService.cancelarMiEntrenador(cancelarData, usuarioId);
  }
  @Put('cancelar/alumno/:id')
  @ApiOperation({
    summary: 'Cancelar un alumno',
    description: 'El entrenador desvincula a un alumno asignado. Requiere confirmar su contraseña.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID (UUID) del alumno.' })
  @ApiOkResponse({
    description: 'Alumno cancelado exitosamente.',
    schema: { example: { success: true, message: 'Alumno cancelado exitosamente' } },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({
    status: 401,
    description: 'Usuario/entrenador no válido, contraseña incorrecta o alumno no asignado.',
  })
  @ApiResponse({ status: 404, description: 'Alumno o entrenador no encontrado.' })
  cancelarAlumno(
    @Body() cancelarData: CancelarAlumnoDto,
    @Param() params: IsUUIDDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.alumnoEntrenadorService.cancelarAlumno(cancelarData, params.id, usuarioId);
  }
  @Post('token/consumir')
  @ApiOperation({
    summary: 'Consumir token de vinculación',
    description:
      'El entrenador consume el token (código + secreto) generado por el alumno y lo vincula.',
  })
  @ApiCreatedResponse({
    description: 'Token consumido y alumno vinculado.',
    schema: {
      example: {
        success: true,
        message: 'Token consumido exitosamente, alumno vinculado al entrenador',
        data: {
          id_alumno: '550e8400-e29b-41d4-a716-446655440000',
          nombre: 'Juan',
          apellido_paterno: 'Pérez',
          apellido_materno: 'López',
          correo: 'juan@example.com',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({
    status: 401,
    description: 'Usuario no válido, token no válido/expirado o alumno ya vinculado.',
  })
  @ApiResponse({ status: 404, description: 'Entrenador o alumno no encontrado.' })
  consumirToken(@Body() consumirTokenDto: ConsumirTokenDto, @CurrentUser('id') usuarioId: string) {
    return this.alumnoEntrenadorService.consumirToken(consumirTokenDto, usuarioId);
  }
  @Post('token')
  @ApiOperation({
    summary: 'Generar token de vinculación',
    description:
      'El alumno genera un token de vinculación (código + secreto) válido por 30 minutos.',
  })
  @ApiCreatedResponse({
    description: 'Token generado exitosamente.',
    schema: {
      example: {
        success: true,
        message: 'Token generado exitosamente',
        data: {
          codigo: 'ABC123',
          secreto: 'f5e3...',
          expira_en: '2026-01-01T00:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'El usuario no es un alumno válido.' })
  @ApiResponse({ status: 404, description: 'Alumno no encontrado.' })
  generarTokenAlumno(@CurrentUser('id') usuarioId: string) {
    return this.alumnoEntrenadorService.generarTokenAlumno(usuarioId);
  }
}
