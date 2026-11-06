import { Module } from '@nestjs/common';

import { EntrenamientosController } from './entrenamientos.controller';
import { MedicionesController } from './mediciones.controller';
import { ProgresoController } from './progreso.controller';
import { SesionesController } from './sesiones.controller';
import { EntrenamientoService } from './entrenamiento.service';

@Module({
  controllers: [
    EntrenamientosController,
    SesionesController,
    MedicionesController,
    ProgresoController,
  ],
  providers: [EntrenamientoService],
})
export class EntrenamientoModule {}
