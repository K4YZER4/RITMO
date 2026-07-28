import { Controller, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { RutinasService } from './rutinas.service';
import { CreateRutinaDto } from './dto/create-rutina.dto';
import { RutinaEjercicioDto } from './dto/rutina-ejercicio.dto';
import { AsignarRutinaDto } from './dto/asignar-rutina.dto';
@Controller('rutinas')
export class RutinasController {
  constructor(private readonly rutinasService: RutinasService) {}

  @Post()
  create(@Body() createRutinaDto: CreateRutinaDto) {
    return this.rutinasService.create(createRutinaDto);
  }
  @Patch(':id/ejercicios')
  updateRutinaEjercicios(
    @Param('id', ParseIntPipe) id: number,
    @Body() rutinaEjercicioDto: RutinaEjercicioDto,
  ) {
    return this.rutinasService.updateRutinaEjercicios(id, rutinaEjercicioDto);
  }

  @Post(':id/asignaciones')
  asignarRutinaAAlumno(@Param('id', ParseIntPipe) id: number, @Body() body: AsignarRutinaDto) {
    return this.rutinasService.asignarRutinaAAlumno(id, body);
  }
}
