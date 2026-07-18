import { Controller, Post, Body } from '@nestjs/common';
import { loginDto } from './dto/login';
import { registerEntrenadorDto } from './dto/registerEntrenador';
import { registerAlumnoDto } from './dto/registerAlumno';
import { AuthService } from './auth.service';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginData: loginDto) {
    return this.authService.login(loginData);
  }

  @Post('register/entrenador')
  register(@Body() registerData: registerEntrenadorDto) {
    return this.authService.registerEntrenador(registerData);
  }

  @Post('register/alumno')
  registerAlumno(@Body() registerData: registerAlumnoDto) {
    return this.authService.registerAlumno(registerData);
  }
}
