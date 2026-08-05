import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { CambiarAlumnoDto } from '../auth/dto/cambiar-alumno.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CancelarAlumnoDto } from '../auth/dto/cancelar-alumno.dto';
import { IsUUIDDto } from '../auth/dto/id-uuid.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
@Injectable()
export class AlumnoEntrenadorService {
  constructor(private readonly prisma: PrismaService) {}
  //
  // Cambiar Alumno method
  //
  async cambiarAlumno(cambiarData: CambiarAlumnoDto) {
    await this.prisma.$transaction(async (tx) => {
      const usuarioEntrenador = await tx.usuario.findUnique({
        where: { id: cambiarData.idEntrenador },
      });
      if (!usuarioEntrenador || usuarioEntrenador.role !== UserRole.entrenador) {
        throw new UnauthorizedException('El usuario no es un entrenador válido');
      }
      const entrenador = await tx.entrenador.findUnique({
        where: { idUsuario: cambiarData.idEntrenador },
      });
      if (!entrenador) {
        throw new UnauthorizedException('Entrenador no encontrado');
      }
      await this.validatePLanYAlumnosLimites(cambiarData.idEntrenador, tx);
      const alumnoUsuario = await tx.usuario.findUnique({
        where: { id: cambiarData.correo_alumno },
      });
      if (!alumnoUsuario || alumnoUsuario.role !== UserRole.alumno) {
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
        where: { idUsuario: cambiarData.correo_alumno },
        data: { idEntrenadorActual: cambiarData.idEntrenador },
      });
      return { success: true, message: 'Alumno cambiado exitosamente' };
    });
  }
  //
  // Cancelar Alumno method
  //
  async cancelarAlumno(cancelarData: CancelarAlumnoDto, idAlumno: IsUUIDDto) {
    await this.prisma.$transaction(async (tx) => {
      const usuarioEntrenador = await tx.usuario.findUnique({
        where: { id: cancelarData.id_entrenador },
      });
      if (!usuarioEntrenador || usuarioEntrenador.role !== UserRole.entrenador) {
        throw new UnauthorizedException('El usuario no es un entrenador válido');
      }
      const entrenador = await tx.entrenador.findUnique({
        where: { idUsuario: cancelarData.id_entrenador },
      });
      if (!entrenador) {
        throw new UnauthorizedException('Entrenador no encontrado');
      }
      const contraseñaAutorizada = await bcrypt.compare(
        cancelarData.contraseña_entrenador,
        usuarioEntrenador.hashedPassword,
      );
      if (!contraseñaAutorizada) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
      const alumnoUsuario = await tx.usuario.findUnique({
        where: { id: idAlumno.id },
      });
      if (!alumnoUsuario || alumnoUsuario.role !== UserRole.alumno) {
        throw new UnauthorizedException('Alumno no encontrado');
      }
      await tx.alumno.update({
        where: { idUsuario: idAlumno.id },
        data: { idEntrenadorActual: null },
      });
      return { success: true, message: 'Alumno cancelado exitosamente' };
    });
  }
  //
  // Validate Plan and Alumnos Limits function
  //
  async validatePLanYAlumnosLimites(idEntrenador: string, tx: Prisma.TransactionClient) {
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
    const plan = await tx.plan.findUnique({
      where: {
        id: entrenador.idPlan,
      },
    });
    if (!plan) {
      throw new UnauthorizedException('Plan del entrenador no encontrado');
    }
    if (numeroAlumno >= plan.limite_alumnos) {
      throw new UnauthorizedException(
        'El entrenador ha alcanzado el límite de alumnos para su plan',
      );
    }
  }
}
