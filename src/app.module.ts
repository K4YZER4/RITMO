import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BigIntSerializeInterceptor } from './common/interceptors/big-int-serialize.interceptor';
import { RutinasModule } from './modules/rutinas/rutinas.module';
import { EjerciciosModule } from './modules/ejercicios/ejercicios.module';
import { AlumnoEntrenadorModule } from './modules/alumno-entrenador/alumno-entrenador.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv, type Env } from './config/env.schema';
import { SuscripcionesModule } from './modules/suscripciones/suscripciones.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guards';
import { SuscripcionGuard } from './common/guards/suscripcion.guards';
import { PagosModule } from './modules/pagos/pagos.module';
import { StripeModule } from './modules/stripe/stripe.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => [
        {
          name: 'default',
          ttl: configService.get('RATE_LIMIT_TTL', { infer: true }),
          limit: configService.get('RATE_LIMIT_GLOBAL_LIMIT', {
            infer: true,
          }),
        },
      ],
    }),
    RutinasModule,
    EjerciciosModule,
    AlumnoEntrenadorModule,
    SuscripcionesModule,
    PagosModule,
    StripeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SuscripcionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntSerializeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
