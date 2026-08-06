import { Module } from '@nestjs/common';
import { RutinasService } from './rutinas.service';
import { RutinasController } from './rutinas.controller';
import { PrismaModule } from '../../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [RutinasController],
  providers: [RutinasService],
})
export class RutinasModule {}
