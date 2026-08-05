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
import { AlumnoEntrenadorService } from '../alumno-entrenador/alumno-entrenador.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly alumnoEntrenadorService: AlumnoEntrenadorService,
  ) {}
  private readonly seedHash: number = 10;
  //
  // Register method
  //
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
          role: UserRole.entrenador,
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
      let roleAlumno: UserRole = UserRole.alumno_con_entrenador;
      if (!registerData.id_entrenador_actual) {
        roleAlumno = UserRole.alumno;
      }
      await this.alumnoEntrenadorService.validatePLanYAlumnosLimites(
        registerData.id_entrenador_actual,
        tx,
      );
      const entrenador = registerData.id_entrenador_actual;
      const user = await tx.usuario.create({
        data: {
          nombre: registerData.nombre,
          role: roleAlumno,
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
          idEntrenadorActual: entrenador,
        },
      });
    });
    return { message: 'Usuario registrado exitosamente' };
  }
}
