import { Controller, Put, Post, Body, Param } from '@nestjs/common';
import { AlumnoEntrenadorService } from './alumno-entrenador.service';
import { CancelarAlumnoDto } from './dto/cancelar-alumno.dto';
import { CancelarMiEntrenadorDto } from './dto/cancelar-mi-entrenador.dto';
import { ConsumirTokenDto } from './dto/consumir-token.dto';
import { IsUUIDDto } from './dto/is-uuid.dto';

@Controller('alumno-entrenador')
export class AlumnoEntrenadorController {
  constructor(private readonly alumnoEntrenadorService: AlumnoEntrenadorService) {}

  @Put('cancelar/mi-entrenador')
  cancelarMiEntrenador(@Body() cancelarData: CancelarMiEntrenadorDto) {
    return this.alumnoEntrenadorService.cancelarMiEntrenador(cancelarData);
  }
  @Put('cancelar/alumno/:id')
  cancelarAlumno(@Body() cancelarData: CancelarAlumnoDto, @Param() params: IsUUIDDto) {
    return this.alumnoEntrenadorService.cancelarAlumno(cancelarData, params.id);
  }
  @Post('token/consumir')
  consumirToken(@Body() consumirTokenDto: ConsumirTokenDto) {
    return this.alumnoEntrenadorService.consumirToken(consumirTokenDto);
  }
  @Post('token/:id')
  generarTokenAlumno(@Param() params: IsUUIDDto) {
    return this.alumnoEntrenadorService.generarTokenAlumno(params);
  }
}
