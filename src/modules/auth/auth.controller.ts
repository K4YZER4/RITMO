import { Controller, Post, Body } from '@nestjs/common';
import { LoginDto } from './dto/login';
import { RegisterEntrenadorDto } from './dto/registerEntrenador';
import { RegisterAlumnoDto } from './dto/registerAlumno';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitEspecifico } from '../../common/decorators/rate-limit.decorator';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('login')
  login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }
  @Public()
  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('registrar/entrenador')
  register(@Body() registerData: RegisterEntrenadorDto) {
    return this.authService.registerEntrenador(registerData);
  }
  @Public()
  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('registrar/alumno')
  registerAlumno(@Body() registerData: RegisterAlumnoDto) {
    return this.authService.registerAlumno(registerData);
  }
}
