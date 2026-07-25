import { Controller, Post, Body, Delete, Patch, Param } from '@nestjs/common';
import { EjerciciosService } from './ejercicios.service';
import { CreateEjercicioPersonalizadoDto } from './dto/create-ejercicio.dto';
import { UpdateEjercicioPersonalizadoDto } from './dto/update-ejercicio.dto';
import { DeleteEjercicioDto } from './dto/delete-ejercicio.dto';
import { IdNumberDto } from './dto/id-number.dto';
@Controller('ejercicios')
export class EjerciciosController {
  constructor(private readonly ejerciciosService: EjerciciosService) {}
  @Post()
  async createEjercicioPersonalizado(
    @Body() createEjercicioPersonalizadoDto: CreateEjercicioPersonalizadoDto,
  ) {
    return this.ejerciciosService.createEjercicioPersonalizado(createEjercicioPersonalizadoDto);
  }
  @Patch(':id')
  async updateEjercicioPersonalizado(
    @Param('id') id: IdNumberDto,
    @Body() updateEjercicioPersonalizadoDto: UpdateEjercicioPersonalizadoDto,
  ) {
    return this.ejerciciosService.updateEjercicioPersonalizado(
      updateEjercicioPersonalizadoDto,
      id.id,
    );
  }
  @Delete(':id')
  async deleteEjercicioPersonalizado(
    @Param('id') id: IdNumberDto,
    @Body() deleteEjercicioDto: DeleteEjercicioDto,
  ) {
    return this.ejerciciosService.deleteEjercicioPersonalizado(deleteEjercicioDto, id.id);
  }
}
