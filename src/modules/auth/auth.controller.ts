import { Controller, Post, Put, Body, Param } from '@nestjs/common';
import { LoginDto } from './dto/login';
import { RegisterEntrenadorDto } from './dto/registerEntrenador';
import { RegisterAlumnoDto } from './dto/registerAlumno';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitEspecifico } from '../../common/decorators/rate-limit.decorator';
import { CambiarAlumnoDto } from './dto/cambiar-alumno.dto';
import { IsUUIDDto } from './dto/id-uuid.dto';
import { CancelarAlumnoDto } from './dto/cancelar-alumno.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimitEspecifico(5) // Limita a 5 solicitudes por minuto
  @Post('login')
  login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }
  @Public()
  @Post('registrar/entrenador')
  register(@Body() registerData: RegisterEntrenadorDto) {
    return this.authService.registerEntrenador(registerData);
  }
  @Public()
  @Post('registrar/alumno')
  registerAlumno(@Body() registerData: RegisterAlumnoDto) {
    return this.authService.registerAlumno(registerData);
  }
  @Put('cambiar/alumno')
  cambiarAlumno(@Body() cambiarData: CambiarAlumnoDto) {
    return this.authService.cambiarAlumno(cambiarData);
  }
  @Put('cambiar/alumno/cancelar/:id')
  cancelarAlumno(@Body() cancelarData: CancelarAlumnoDto, @Param('id') id: IsUUIDDto) {
    return this.authService.cancelarAlumno(cancelarData, id);
  }
}
