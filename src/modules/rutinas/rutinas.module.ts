import { Module } from '@nestjs/common';
import { RutinasService } from './rutinas.service';
import { RutinasController } from './rutinas.controller';

@Module({
  controllers: [RutinasController],
  providers: [RutinasService],
})
export class RutinasModule {}
