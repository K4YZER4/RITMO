import { Module } from '@nestjs/common';
import { EjerciciosService } from './ejercicios.service';
import { EjerciciosController } from './ejercicios.controller';
import { PrismaModule } from '../../prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [EjerciciosController],
  providers: [EjerciciosService],
})
export class EjerciciosModule {}
