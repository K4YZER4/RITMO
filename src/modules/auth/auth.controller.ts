import { Controller, Post, Body } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterEntrenadorDto } from './dto/register-entrenador.dto';
import { RegisterAlumnoDto } from './dto/register-alumno.dto';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitEspecifico } from '../../common/decorators/rate-limit.decorator';
import { SinSuscripcion } from '../../common/decorators/sin-suscripcion.decorator';
@ApiTags('Auth')
@Controller('auth')
@SinSuscripcion()
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Verifica las credenciales y emite un access token JWT.',
  })
  @ApiCreatedResponse({
    description: 'Credenciales válidas. Devuelve el token JWT de acceso.',
    schema: {
      example: {
        message: 'Inicio de sesión exitoso',
        token: '<JWT>',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 401, description: 'Usuario no encontrado o contraseña incorrecta.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit).' })
  login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }
  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('registrar/entrenador')
  @ApiOperation({
    summary: 'Registrar entrenador',
    description:
      'Registra un entrenador, crea su suscripción inicial y devuelve un mensaje de éxito.',
  })
  @ApiCreatedResponse({
    description: 'Entrenador registrado exitosamente.',
    schema: { example: { message: 'Usuario registrado exitosamente' } },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 404, description: 'Plan del entrenador no encontrado o inactivo.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit).' })
  register(@Body() registerData: RegisterEntrenadorDto) {
    return this.authService.registerEntrenador(registerData);
  }
  @RateLimitEspecifico(2) // Limita a 5 solicitudes por minuto
  @Post('registrar/alumno')
  @ApiOperation({
    summary: 'Registrar alumno',
    description: 'Registra un alumno, crea su suscripción inicial y devuelve un mensaje de éxito.',
  })
  @ApiCreatedResponse({
    description: 'Alumno registrado exitosamente.',
    schema: { example: { message: 'Usuario registrado exitosamente' } },
  })
  @ApiResponse({ status: 400, description: 'Errores de validación del body.' })
  @ApiResponse({ status: 404, description: 'Plan del alumno no encontrado o inactivo.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit).' })
  registerAlumno(@Body() registerData: RegisterAlumnoDto) {
    return this.authService.registerAlumno(registerData);
  }
}
