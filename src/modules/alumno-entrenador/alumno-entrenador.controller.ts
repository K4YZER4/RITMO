import { Controller } from '@nestjs/common';
import { AlumnoEntrenadorService } from './alumno-entrenador.service';

@Controller('alumno-entrenador')
export class AlumnoEntrenadorController {
  constructor(private readonly alumnoEntrenadorService: AlumnoEntrenadorService) {}
}
