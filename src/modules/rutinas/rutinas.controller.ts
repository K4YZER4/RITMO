import { Controller, Post, Body, Patch, Param, Get, Delete } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RutinasService } from './rutinas.service';
import { CreateRutinaDto } from './dto/create-rutina.dto';
import { RutinaEjercicioDto } from './dto/rutina-ejercicio.dto';
import { AsignarRutinaDto } from './dto/asignar-rutina.dto';
import { ActualizarAsignacionDto } from './dto/actualizar-asignacion.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../../common/pipes/parse-big-int.pipe';
@ApiTags('Rutinas')
@ApiBearerAuth('access-token')
@Controller('rutinas')
export class RutinasController {
  constructor(private readonly rutinasService: RutinasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar rutinas creadas por el usuario' })
  @ApiOkResponse({ description: 'Rutinas activas e inactivas del usuario autenticado.' })
  findAll(@CurrentUser('id') usuarioId: string) {
    return this.rutinasService.findAll(usuarioId);
  }

  @Get('archivadas')
  @ApiOperation({ summary: 'Listar rutinas archivadas creadas por el usuario' })
  @ApiOkResponse({ description: 'Rutinas archivadas del usuario autenticado.' })
  findArchived(@CurrentUser('id') usuarioId: string) {
    return this.rutinasService.findArchived(usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una rutina' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la rutina.' })
  @ApiOkResponse({ description: 'Rutina con ejercicios y asignaciones.' })
  findOne(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser('id') usuarioId: string) {
    return this.rutinasService.findOne(id, usuarioId);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear rutina',
    description: 'Crea una rutina. Valida los permisos del rol y el límite de rutinas del plan.',
  })
  @ApiCreatedResponse({
    description: 'Rutina creada exitosamente.',
    schema: { example: { success: true, message: 'Rutina creada exitosamente' } },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación o límite de rutinas alcanzado.' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para crear rutinas.' })
  @ApiResponse({ status: 404, description: 'Usuario, entrenador o plan no encontrado.' })
  create(@Body() createRutinaDto: CreateRutinaDto, @CurrentUser('id') usuarioId: string) {
    return this.rutinasService.create(createRutinaDto, usuarioId);
  }
  @Patch(':id/ejercicios')
  @ApiOperation({
    summary: 'Actualizar ejercicios de una rutina',
    description:
      'Reemplaza todos los ejercicios de una rutina (borra y recrea) en una transacción.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID de la rutina (bigint como string).' })
  @ApiOkResponse({
    description: 'Ejercicios de la rutina actualizados exitosamente.',
    schema: {
      example: { success: true, message: 'Ejercicios de la rutina actualizados exitosamente' },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  updateRutinaEjercicios(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() rutinaEjercicioDto: RutinaEjercicioDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.rutinasService.updateRutinaEjercicios(id, rutinaEjercicioDto, usuarioId);
  }

  @Patch(':id/archivar')
  @ApiOperation({ summary: 'Archivar una rutina sin borrar su historial' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la rutina.' })
  @ApiOkResponse({ description: 'Rutina archivada y asignaciones activas deshabilitadas.' })
  archivar(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser('id') usuarioId: string) {
    return this.rutinasService.archivar(id, usuarioId);
  }

  @Post(':id/asignaciones')
  @ApiOperation({
    summary: 'Asignar rutina a un alumno',
    description:
      'Asigna la rutina a un alumno en un día concreto, recortando o rechazando solapamientos con otras asignaciones.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID de la rutina (bigint como string).' })
  @ApiCreatedResponse({
    description: 'Rutina asignada al alumno exitosamente.',
    schema: {
      example: { success: true, message: 'Rutina asignada al alumno exitosamente' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'La rutina se traslapa con otra asignación ya registrada para ese día.',
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso para asignar esta rutina.' })
  @ApiResponse({ status: 404, description: 'Usuario o rutina no encontrado.' })
  asignarRutinaAAlumno(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: AsignarRutinaDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.rutinasService.asignarRutinaAAlumno(id, body, usuarioId);
  }

  @Patch('asignaciones/:id')
  @ApiOperation({ summary: 'Cambiar una asignación semanal de rutina' })
  actualizarAsignacion(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: ActualizarAsignacionDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.rutinasService.actualizarAsignacion(id, body, usuarioId);
  }

  @Delete('asignaciones/:id')
  @ApiOperation({ summary: 'Quitar una rutina asignada sin borrar su historial' })
  quitarAsignacion(@Param('id', ParseBigIntPipe) id: bigint, @CurrentUser('id') usuarioId: string) {
    return this.rutinasService.quitarAsignacion(id, usuarioId);
  }
}
