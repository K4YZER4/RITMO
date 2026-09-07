import { Controller, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EjerciciosService } from './ejercicios.service';
import { CreateEjercicioPersonalizadoDto } from './dto/create-ejercicio.dto';
import { UpdateEjercicioPersonalizadoDto } from './dto/update-ejercicio.dto';
import { IdNumberDto } from './dto/id-number.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
@ApiTags('Ejercicios Personalizados')
@ApiBearerAuth('access-token')
@Controller('ejerciciosPersonalizados')
export class EjerciciosController {
  constructor(private readonly ejerciciosService: EjerciciosService) {}
  @Post()
  @ApiOperation({
    summary: 'Crear ejercicio personalizado',
    description:
      'Crea un ejercicio personalizado con sus músculos/equipos. Valida el límite de ejercicios del plan del alumno.',
  })
  @ApiCreatedResponse({
    description: 'Ejercicio personalizado creado exitosamente.',
    schema: {
      example: {
        success: true,
        message: 'Ejercicio personalizado creado exitosamente',
        data: { id: '123' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 403, description: 'El usuario no es un alumno/entrenador válido.' })
  @ApiResponse({ status: 404, description: 'Usuario o plan del alumno no encontrado.' })
  @ApiResponse({ status: 429, description: 'Rate limit superado.' })
  async createEjercicioPersonalizado(
    @Body() createEjercicioPersonalizadoDto: CreateEjercicioPersonalizadoDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.ejerciciosService.createEjercicioPersonalizado(
      createEjercicioPersonalizadoDto,
      usuarioId,
    );
  }
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar ejercicio personalizado',
    description:
      'Actualiza un ejercicio personalizado (solo el creador). Reemplaza los músculos y equipos asociados.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID del ejercicio (bigint como string).' })
  @ApiOkResponse({
    description: 'Ejercicio personalizado actualizado exitosamente.',
    schema: {
      example: {
        success: true,
        message: 'Ejercicio personalizado actualizado exitosamente',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 403, description: 'No tienes permiso para modificar este ejercicio.' })
  @ApiResponse({ status: 404, description: 'Ejercicio personalizado no encontrado.' })
  async updateEjercicioPersonalizado(
    @Param() params: IdNumberDto,
    @Body() updateEjercicioPersonalizadoDto: UpdateEjercicioPersonalizadoDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.ejerciciosService.updateEjercicioPersonalizado(
      updateEjercicioPersonalizadoDto,
      params.id,
      usuarioId,
    );
  }
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar (desactivar) ejercicio personalizado',
    description:
      'Desactiva un ejercicio personalizado (soft-delete). Solo el creador puede eliminarlo.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID del ejercicio (bigint como string).' })
  @ApiOkResponse({
    description: 'Ejercicio personalizado desactivado exitosamente.',
    schema: {
      example: {
        success: true,
        message: 'Ejercicio personalizado desactivado exitosamente',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso para eliminar este ejercicio.' })
  @ApiResponse({ status: 404, description: 'Ejercicio personalizado no encontrado.' })
  async deleteEjercicioPersonalizado(
    @Param() params: IdNumberDto,
    @CurrentUser('id') usuarioId: string,
  ) {
    return this.ejerciciosService.deleteEjercicioPersonalizado(params.id, usuarioId);
  }
}
