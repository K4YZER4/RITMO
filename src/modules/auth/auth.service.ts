import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { registerEntrenadorDto } from './dto/registerEntrenador';
import { loginDto } from './dto/login';
import * as bcrypt from 'bcrypt';
import { registerAlumnoDto } from './dto/registerAlumno';
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly seedHash: number = 10;
  //
  // Register method
  //
  async registerEntrenador(registerData: registerEntrenadorDto) {
    console.log('Registering user:', registerData);
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo.toUpperCase() === 'MASCULINO' ? 1 : 2; // Assuming 1 for MASCULINO and 2 for FEMENINO
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre: registerData.nombre,
          apellidoPaterno: registerData.apellido_paterno,
          apellidoMaterno: registerData.apellido_materno,
          correo: registerData.correo,
          hashedPassword: hashedPassword,
          fechaNacimiento: new Date(registerData.fecha_nacimiento),
          idSexo: idSexo,
        },
      });
      if (!user) {
        throw new Error('Error al registrar el usuario');
      }
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
  async login(loginData: loginDto) {
    console.log('Logging in user:', loginData);
    const user = await this.prisma.usuario.findUnique({
      where: { correo: loginData.correo },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    if (!(await bcrypt.compare(loginData.password, user.hashedPassword))) {
      throw new Error('Contraseña incorrecta');
    }
    return { message: 'Inicio de sesión exitoso' };
  }
  //
  // Register Alumno method
  //
  async registerAlumno(registerData: registerAlumnoDto) {
    console.log('Registering user:', registerData);
    const hashedPassword = await bcrypt.hash(registerData.password, this.seedHash);
    const idSexo = registerData.sexo.toUpperCase() === 'MASCULINO' ? 1 : 2; // Assuming 1 for MASCULINO and 2 for FEMENINO
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          nombre: registerData.nombre,
          apellidoPaterno: registerData.apellido_paterno,
          apellidoMaterno: registerData.apellido_materno,
          correo: registerData.correo,
          hashedPassword: hashedPassword,
          fechaNacimiento: new Date(registerData.fecha_nacimiento),
          idSexo: idSexo,
        },
      });
      if (!user) {
        throw new Error('Error al registrar el usuario');
      }
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
}
