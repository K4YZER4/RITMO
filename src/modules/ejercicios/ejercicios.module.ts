import { Module } from '@nestjs/common';
import { EjerciciosService } from './ejercicios.service';
import { EjerciciosController } from './ejercicios.controller';
import { PrismaService } from '../../prisma/prisma.service';
@Module({
  controllers: [EjerciciosController],
  providers: [EjerciciosService, PrismaService],
})
export class EjerciciosModule {}
