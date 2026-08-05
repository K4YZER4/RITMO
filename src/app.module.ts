import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RutinasModule } from './modules/rutinas/rutinas.module';
import { EjerciciosModule } from './modules/ejercicios/ejercicios.module';
import { AlumnoEntrenadorModule } from './modules/alumno-entrenador/alumno-entrenador.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 1000,
        limit: 30,
      },
    ]),
    RutinasModule,
    EjerciciosModule,
    AlumnoEntrenadorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
