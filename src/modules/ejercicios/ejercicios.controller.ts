import { Controller } from '@nestjs/common';
import { EjerciciosService } from './ejercicios.service';
@Controller('ejercicios')
export class EjerciciosController {
  constructor(private readonly ejerciciosService: EjerciciosService) {}
}
