import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';
import { JwtModule } from '@nestjs/jwt';
const jwtExpiration = parseInt(process.env.JWT_EXPIRATION_TIME ?? '86400', 10);
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: jwtExpiration },
    }),
    PrismaModule,
    SuscripcionesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
