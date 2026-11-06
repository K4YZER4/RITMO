import { Controller, Post, Body, Req } from '@nestjs/common';
import type { Request } from 'express';
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

  @RateLimitEspecifico(2) // Limita a 2 solicitudes por ventana RATE_LIMIT_TTL
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
  @ApiResponse({ status: 401, description: 'Correo o contraseña incorrectos.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit).' })
  login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }
  @RateLimitEspecifico(3) // Limita a 3 solicitudes por ventana RATE_LIMIT_TTL
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
  @RateLimitEspecifico(3) // Limita a 3 solicitudes por ventana RATE_LIMIT_TTL
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

  @RateLimitEspecifico(5) // Limita a 5 solicitudes por ventana RATE_LIMIT_TTL
  @Post('logout')
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Revoca el access token actual (por su jti). Mientras el token no expira, no volverá a ser aceptado.',
  })
  @ApiCreatedResponse({
    description: 'Sesión cerrada exitosamente.',
    schema: { example: { message: 'Sesión cerrada exitosamente' } },
  })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado.' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes (rate limit).' })
  logout(@Req() request: Request) {
    const authHeader = request.headers.authorization;

    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    return this.authService.logout(token);
  }
}
