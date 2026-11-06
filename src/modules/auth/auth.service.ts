import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterEntrenadorDto } from './dto/register-entrenador.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterAlumnoDto } from './dto/register-alumno.dto';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { JwtService } from '@nestjs/jwt';
import { DB_SEXO_IDS } from '../../common/constants/db-sexo';
import { UserRole } from '@prisma/client';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { withTransactionRetry } from '../../common/utils/transaction-retry';
@Injectable()
export class AuthService implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly suscripcionesService: SuscripcionesService,
  ) {}

  private readonly seedHash: number = 10;
  private cleanupInterval?: NodeJS.Timeout;

  async onApplicationBootstrap(): Promise<void> {
    const INTERVALO_HORAS = 24;

    const ejecutar = async () => {
      try {
        await this.limpiarTokensRevocadosVencidos();
      } catch (err) {
        console.error('Error al limpiar tokens revocados vencidos:', err);
      }
    };

    await ejecutar();

    this.cleanupInterval = setInterval(() => void ejecutar(), INTERVALO_HORAS * 60 * 60 * 1000);
    this.cleanupInterval.unref();
  }

  onApplicationShutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  private async limpiarTokensRevocadosVencidos(): Promise<void> {
    await this.prisma.tokenRevocado.deleteMany({
      where: {
        expiraEn: {
          lt: new Date(),
        },
      },
    });
  }
  //
  // Register Entrenador method
  //
  async registerEntrenador(registerData: RegisterEntrenadorDto) {
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo === 'MASCULINO' ? DB_SEXO_IDS.MASCULINO : DB_SEXO_IDS.FEMENINO;

    const idPlan = registerData.id_plan ?? 1;

    await this.validarPlanEntrenador(idPlan);

    return withTransactionRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const user = await tx.usuario.create({
          data: {
            nombre: registerData.nombre,
            apellidoPaterno: registerData.apellido_paterno,
            apellidoMaterno: registerData.apellido_materno,
            correo: this.normalizarCorreo(registerData.correo),
            hashedPassword,
            fechaNacimiento: new Date(registerData.fecha_nacimiento),
            role: UserRole.entrenador,
            idSexo,
          },
        });

        await tx.entrenador.create({
          data: {
            idUsuario: user.id,
            idPlan,
            slug: registerData.nombre_publico.toLowerCase().replace(/\s+/g, '-'),
            fechaEntrenador: new Date(registerData.fecha_entrenador),
            nombrePublico: registerData.nombre_publico,
          },
        });

        const resultado = await this.suscripcionesService.activarSuscripcionInicial(user.id, tx);

        return this.construirRespuestaRegistro(resultado);
      }),
    );
  }
  //
  // Login method
  //
  async login(loginData: LoginDto) {
    const correo = this.normalizarCorreo(loginData.correo);
    const user = await this.prisma.usuario.findUnique({
      where: { correo },
    });

    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    if (!(await bcrypt.compare(loginData.password, user.hashedPassword))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload: JwtPayload = {
      sub: user.id,
      id: user.id,
      correo: user.correo,
      role: user.role,
      jti: randomUUID(),
    };
    const token = this.jwtService.sign(payload);

    return { message: 'Inicio de sesión exitoso', token };
  }
  //
  // Logout method (revoca el token por jti)
  //
  async logout(token: string) {
    let payload: JwtPayload & { exp?: number };

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload & { exp?: number }>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    if (!payload.jti) {
      return { message: 'Sesión cerrada exitosamente' };
    }

    const expiraEn = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 86400000);

    await this.prisma.tokenRevocado.upsert({
      where: {
        jti: payload.jti,
      },
      update: {},
      create: {
        jti: payload.jti,
        usuarioId: payload.id,
        expiraEn,
      },
    });

    return { message: 'Sesión cerrada exitosamente' };
  }
  //
  // Register Alumno method
  //
  async registerAlumno(registerData: RegisterAlumnoDto) {
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo === 'MASCULINO' ? DB_SEXO_IDS.MASCULINO : DB_SEXO_IDS.FEMENINO;

    const idPlan = registerData.id_plan ?? 1;

    await this.validarPlanAlumno(idPlan);

    return withTransactionRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const roleAlumno: UserRole = UserRole.alumno;

        const user = await tx.usuario.create({
          data: {
            nombre: registerData.nombre,
            role: roleAlumno,
            apellidoPaterno: registerData.apellido_paterno,
            apellidoMaterno: registerData.apellido_materno,
            correo: this.normalizarCorreo(registerData.correo),
            hashedPassword,
            fechaNacimiento: new Date(registerData.fecha_nacimiento),
            idSexo,
          },
        });

        await tx.alumno.create({
          data: {
            idUsuario: user.id,
            idPlan,
            numeroCelular: registerData.numero_celular,
            fechaInicioEntrenamiento: new Date(registerData.fecha_inicio_entrenamiento),
            idObjetivo: registerData.id_objetivo,
            idNivelActividad: registerData.id_nivel_actividad,
            observacionesMedicas: registerData.observaciones_medicas,
            lesionesActuales: registerData.lesiones_actuales,
            lesionesPasadas: registerData.lesiones_pasadas,
            contactoEmergenciaNombre: registerData.contacto_emergencia_nombre,
            contactoEmergenciaTelefono: registerData.contacto_emergencia_telefono,
          },
        });

        const resultado = await this.suscripcionesService.activarSuscripcionInicial(user.id, tx);

        return this.construirRespuestaRegistro(resultado);
      }),
    );
  }

  private async validarPlanEntrenador(idPlan: number): Promise<void> {
    const plan = await this.prisma.planEntrenador.findUnique({
      where: {
        id: idPlan,
      },
      select: {
        id: true,
        estaActivo: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`El plan de entrenador ${idPlan} no existe`);
    }

    if (!plan.estaActivo) {
      throw new BadRequestException(`El plan de entrenador ${idPlan} está inactivo`);
    }
  }

  private async validarPlanAlumno(idPlan: number): Promise<void> {
    const plan = await this.prisma.planAlumno.findUnique({
      where: {
        id: idPlan,
      },
      select: {
        id: true,
        estaActivo: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`El plan de alumno ${idPlan} no existe`);
    }

    if (!plan.estaActivo) {
      throw new BadRequestException(`El plan de alumno ${idPlan} está inactivo`);
    }
  }

  private construirRespuestaRegistro(resultado: { pagoId?: bigint; suscripcion: { id: bigint } }) {
    const pagoId = resultado.pagoId;

    if (!pagoId) {
      return {
        message: 'Usuario registrado exitosamente',
      };
    }

    return {
      message: 'Usuario registrado exitosamente',
      requierePago: true,
      pagoId: pagoId.toString(),
      suscripcionId: resultado.suscripcion.id.toString(),
    };
  }

  private normalizarCorreo(correo: string): string {
    return correo.trim().toLowerCase();
  }
}
