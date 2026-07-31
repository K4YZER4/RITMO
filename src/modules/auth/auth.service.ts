import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterEntrenadorDto } from './dto/registerEntrenador';
import { LoginDto } from './dto/login';
import * as bcrypt from 'bcrypt';
import { RegisterAlumnoDto } from './dto/registerAlumno';
import type { JwtPayload } from '../../common/types/jwt-payload';
import { JwtService } from '@nestjs/jwt';
import { DB_SEXO_IDS } from '../../common/constants/db-sexo';
import { UserRole } from '@prisma/client';
import { CambiarAlumnoDto } from './dto/cambiar-alumno.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  private readonly seedHash: number = 10;
  //
  // Register method

  async registerEntrenador(registerData: RegisterEntrenadorDto) {
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo === 'MASCULINO' ? DB_SEXO_IDS.MASCULINO : DB_SEXO_IDS.FEMENINO;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre: registerData.nombre,
          apellidoPaterno: registerData.apellido_paterno,
          apellidoMaterno: registerData.apellido_materno,
          correo: registerData.correo,
          hashedPassword: hashedPassword,
          fechaNacimiento: new Date(registerData.fecha_nacimiento),
          role: UserRole.ENTRENADOR,
          idSexo: idSexo,
        },
      });
      await tx.entrenador.create({
        data: {
          idUsuario: user.id,
          slug: registerData.nombre_publico.toLowerCase().replace(/\s+/g, '-'),
          fechaEntrenador: new Date(registerData.fecha_entrenador),
          nombrePublico: registerData.nombre_publico,
        },
      });
    });
    return { message: 'Usuario registrado exitosamente' };
  }

  //
  // Login method
  //
  async login(loginData: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { correo: loginData.correo },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (!(await bcrypt.compare(loginData.password, user.hashedPassword))) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    const payload: JwtPayload = { sub: user.id, correo: user.correo, role: user.role };
    const token = this.jwtService.sign(payload);
    return { message: 'Inicio de sesión exitoso', token };
  }
  //
  // Register Alumno method
  //
  async registerAlumno(registerData: RegisterAlumnoDto) {
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo === 'MASCULINO' ? DB_SEXO_IDS.MASCULINO : DB_SEXO_IDS.FEMENINO;
    await this.prisma.$transaction(async (tx) => {
      await this.validatePLanYAlumnosLimites(registerData.id_entrenador_actual);
      const user = await tx.usuario.create({
        data: {
          nombre: registerData.nombre,
          role: UserRole.ALUMNO,
          apellidoPaterno: registerData.apellido_paterno,
          apellidoMaterno: registerData.apellido_materno,
          correo: registerData.correo,
          hashedPassword: hashedPassword,
          fechaNacimiento: new Date(registerData.fecha_nacimiento),
          idSexo: idSexo,
        },
      });
      const numeroCelularString = registerData.numero_celular.toString();
      await tx.alumno.create({
        data: {
          idUsuario: user.id,
          numeroCelular: numeroCelularString,
          fechaInicioEntrenamiento: new Date(registerData.fecha_inicio_entrenamiento),
          objetivo: registerData.objetivo,
          nivelActividad: registerData.nivel_actividad,
          observacionesMedicas: registerData.observaciones_medicas,
          lesionesActuales: registerData.lesiones_actuales,
          lesionesPasadas: registerData.lesiones_pasadas,
          contactoEmergenciaNombre: registerData.contacto_emergencia_nombre,
          contactoEmergenciaTelefono: registerData.contacto_emergencia_telefono,
          idEntrenadorActual: registerData.id_entrenador_actual,
        },
      });
    });
    return { message: 'Usuario registrado exitosamente' };
  }
  //
  // Cambiar Alumno method
  //
  async cambiarAlumno(cambiarData: CambiarAlumnoDto) {
    await this.prisma.$transaction(async (tx) => {
      const usuarioEntrenador = await tx.usuario.findUnique({
        where: { id: cambiarData.idEntrenador },
      });
      if (!usuarioEntrenador || usuarioEntrenador.role !== UserRole.ENTRENADOR) {
        throw new UnauthorizedException('El usuario no es un entrenador válido');
      }
      const entrenador = await tx.entrenador.findUnique({
        where: { idUsuario: cambiarData.idEntrenador },
      });
      if (!entrenador) {
        throw new UnauthorizedException('Entrenador no encontrado');
      }
      await this.validatePLanYAlumnosLimites(cambiarData.idEntrenador);
      const alumnoUsuario = await tx.usuario.findUnique({
        where: { id: cambiarData.idAlumno },
      });
      if (!alumnoUsuario || alumnoUsuario.role !== UserRole.ALUMNO) {
        throw new UnauthorizedException('Alumno no encontrado');
      }
      const isPasswordValid = await bcrypt.compare(
        cambiarData.constraseña_alumno,
        alumnoUsuario.hashedPassword,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
      await tx.alumno.update({
        where: { idUsuario: cambiarData.idAlumno },
        data: { idEntrenadorActual: cambiarData.idEntrenador },
      });
      return { success: true, message: 'Alumno cambiado exitosamente' };
    });
  }
  async validatePLanYAlumnosLimites(idEntrenador: string) {
    await this.prisma.$transaction(async (tx) => {
      const numeroAlumno = await tx.alumno.count({
        where: {
          idEntrenadorActual: idEntrenador,
        },
      });
      const entrenador = await tx.entrenador.findUnique({
        where: {
          idUsuario: idEntrenador,
        },
      });
      if (!entrenador) {
        throw new UnauthorizedException('Entrenador no encontrado');
      }
      const plan = await tx.entrenadorPlan.findUnique({
        where: {
          id: entrenador.idPlan,
        },
      });
      if (!plan) {
        throw new UnauthorizedException('Plan del entrenador no encontrado');
      }
      if (numeroAlumno >= plan.cantidadAlumno) {
        throw new UnauthorizedException(
          'El entrenador ha alcanzado el límite de alumnos para su plan',
        );
      }
    });
  }
}
