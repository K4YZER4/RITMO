import { Module } from '@nestjs/common';
import { AlumnoEntrenadorService } from './alumno-entrenador.service';
import { AlumnoEntrenadorController } from './alumno-entrenador.controller';

@Module({
  controllers: [AlumnoEntrenadorController],
  providers: [AlumnoEntrenadorService],
  exports: [AlumnoEntrenadorService],
})
export class AlumnoEntrenadorModule {}
