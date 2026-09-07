import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CancelarAlumnoDto } from './dto/cancelar-alumno.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { NotFoundException, UnauthorizedException } from '@nestjs/common/exceptions';
import { ConsumirTokenDto } from './dto/consumir-token.dto';
import { CancelarMiEntrenadorDto } from './dto/cancelar-mi-entrenador.dto';
import * as crypto from 'crypto';
import { validate as isUUID } from 'uuid';
@Injectable()
export class AlumnoEntrenadorService {
  constructor(private readonly prisma: PrismaService) {}
  //
  // Cancelar Mi Entrenador method (el alumno se quita a su entrenador)
  //
  async cancelarMiEntrenador(cancelarData: CancelarMiEntrenadorDto, alumnoId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const alumnoUsuario = await tx.usuario.findUnique({
        where: { id: alumnoId },
      });
      if (!alumnoUsuario || alumnoUsuario.role !== UserRole.alumnoConEntrenador) {
        throw new UnauthorizedException('Alumno no encontrado');
      }
      const contraseñaAutorizada = await bcrypt.compare(
        cancelarData.contraseña_alumno,
        alumnoUsuario.hashedPassword,
      );
      if (!contraseñaAutorizada) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
      const alumno = await tx.alumno.findUnique({
        where: { idUsuario: alumnoId },
      });
      if (!alumno || !alumno.idEntrenadorActual) {
        throw new UnauthorizedException('El alumno no tiene un entrenador asignado');
      }
      await this.finalizarVinculacion(tx, alumnoId, alumnoId, 'Cancelado por el alumno');
      return { success: true, message: 'Alumno desvinculado de su entrenador exitosamente' };
    });
  }
  //
  // Cancelar Alumno method (el entrenador quita a su alumno)
  //
  async cancelarAlumno(cancelarData: CancelarAlumnoDto, idAlumno: string, entrenadorId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const usuarioEntrenador = await tx.usuario.findUnique({
        where: { id: entrenadorId },
      });
      if (!usuarioEntrenador || usuarioEntrenador.role !== UserRole.entrenador) {
        throw new UnauthorizedException('El usuario no es un entrenador válido');
      }
      const entrenador = await tx.entrenador.findUnique({
        where: { idUsuario: entrenadorId },
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
        where: { id: idAlumno },
      });
      if (!alumnoUsuario || alumnoUsuario.role !== UserRole.alumnoConEntrenador) {
        throw new UnauthorizedException('Alumno no encontrado');
      }
      const alumno = await tx.alumno.findUnique({
        where: { idUsuario: idAlumno },
      });
      if (!alumno || alumno.idEntrenadorActual !== entrenadorId) {
        throw new UnauthorizedException('El entrenador no tiene asignado a este alumno');
      }
      await this.finalizarVinculacion(tx, idAlumno, entrenadorId, 'Cancelado por el entrenador');
      return { success: true, message: 'Alumno cancelado exitosamente' };
    });
  }
  //
  // Finalizar vinculación function (cierra historial, quita entrenador y revierte role)
  //
  private async finalizarVinculacion(
    tx: Prisma.TransactionClient,
    idAlumno: string,
    actualizadoPor: string,
    motivoCambio: string,
  ) {
    if (!isUUID(idAlumno)) {
      throw new NotFoundException('ID de alumno no válido');
    }
    if (!isUUID(actualizadoPor)) {
      throw new NotFoundException('ID de usuario que actualiza no válido');
    }
    await tx.alumnoEntrenadorHistorial.updateMany({
      where: {
        idUsuario: idAlumno,
        activo: true,
      },
      data: { activo: false, fechaFin: new Date(), motivoCambio },
    });
    await tx.alumno.update({
      where: {
        idUsuario: idAlumno,
      },
      data: {
        idEntrenadorActual: null,
        updatedBy: actualizadoPor,
      },
    });
    await tx.usuario.update({
      where: {
        id: idAlumno,
      },
      data: {
        role: UserRole.alumno,
      },
    });
  }
  //
  // Validate PLan and Alumnos Limits function
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
    const plan = await tx.planEntrenador.findUnique({
      where: {
        id: entrenador.idPlan,
      },
    });
    if (!plan) {
      throw new UnauthorizedException('Plan del entrenador no encontrado');
    }
    if (numeroAlumno >= plan.limiteAlumnos) {
      throw new UnauthorizedException(
        'El entrenador ha alcanzado el límite de alumnos para su plan',
      );
    }
  }
  //
  // Generar Token Alumno method
  //
  async generarTokenAlumno(id: string) {
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
    const secreto = crypto.randomBytes(32).toString('hex');
    const token = await this.prisma.$transaction(async (tx) => {
      const usuarioAlumno = await tx.usuario.findUnique({
        where: {
          id: id,
        },
      });
      if (!usuarioAlumno || usuarioAlumno.role !== UserRole.alumno) {
        throw new UnauthorizedException('El usuario no es un alumno válido');
      }
      const alumno = await tx.alumno.findUnique({
        where: {
          idUsuario: id,
        },
      });
      if (!alumno) {
        throw new NotFoundException('Alumno no encontrado');
      }
      const tokenActivo = await tx.tokenVinculacionAlumno.findFirst({
        where: {
          idAlumno: id,
          usadoEn: null,
          revocadoEn: null,
        },
      });
      if (tokenActivo) {
        await tx.tokenVinculacionAlumno.update({
          where: {
            id: tokenActivo.id,
          },
          data: {
            revocadoEn: new Date(),
            actualizadoEn: new Date(),
            actualizadoPor: id,
          },
        });
      }
      const expiraEn = new Date(Date.now() + 30 * 60 * 1000);
      return tx.tokenVinculacionAlumno.create({
        data: {
          idAlumno: id,
          codigoHash: this.hashToken(codigo),
          secretoHash: this.hashToken(secreto),
          actualizadoPor: id,
          expiraEn: expiraEn,
        },
      });
    });
    return {
      success: true,
      message: 'Token generado exitosamente',
      data: {
        codigo,
        secreto,
        expira_en: token.expiraEn,
      },
    };
  }
  //
  // Consumir Token method
  //
  async consumirToken(consumirTokenDto: ConsumirTokenDto, usuarioId: string) {
    const codigoHash = this.hashToken(consumirTokenDto.codigo);
    const secretoHash = this.hashToken(consumirTokenDto.secreto);
    const resultado = await this.prisma.$transaction(async (tx) => {
      const usuarioEntrenador = await tx.usuario.findUnique({
        where: {
          id: usuarioId,
        },
      });
      if (!usuarioEntrenador || usuarioEntrenador.role !== UserRole.entrenador) {
        throw new UnauthorizedException('El usuario no es un entrenador válido');
      }
      const entrenador = await tx.entrenador.findUnique({
        where: {
          idUsuario: usuarioId,
        },
      });
      if (!entrenador) {
        throw new UnauthorizedException('Entrenador no encontrado');
      }
      await this.validatePLanYAlumnosLimites(usuarioId, tx);
      const token = await tx.tokenVinculacionAlumno.findFirst({
        where: {
          codigoHash,
          secretoHash,
          usadoEn: null,
          revocadoEn: null,
        },
      });
      if (!token) {
        throw new UnauthorizedException('Token no válido o ya ha sido utilizado');
      }
      if (token.expiraEn && token.expiraEn < new Date()) {
        throw new UnauthorizedException('El token ha expirado');
      }
      const alumno = await tx.alumno.findUnique({
        where: {
          idUsuario: token.idAlumno,
        },
        include: {
          usuario: true,
        },
      });
      if (!alumno) {
        throw new NotFoundException('Alumno no encontrado');
      }
      if (alumno.usuario.role !== UserRole.alumno || alumno.idEntrenadorActual !== null) {
        throw new UnauthorizedException('El alumno ya tiene un entrenador asignado');
      }
      await tx.tokenVinculacionAlumno.update({
        where: {
          id: token.id,
        },
        data: {
          usadoEn: new Date(),
          reclamadoPorEntrenador: usuarioId,
          actualizadoEn: new Date(),
          actualizadoPor: usuarioId,
        },
      });
      await tx.alumno.update({
        where: {
          idUsuario: token.idAlumno,
        },
        data: {
          idEntrenadorActual: usuarioId,
        },
      });
      await tx.alumnoEntrenadorHistorial.create({
        data: {
          idUsuario: token.idAlumno,
          idEntrenador: usuarioId,
          activo: true,
          createdBy: usuarioId,
        },
      });
      await tx.usuario.update({
        where: {
          id: token.idAlumno,
        },
        data: {
          role: UserRole.alumnoConEntrenador,
        },
      });
      return {
        id_alumno: alumno.idUsuario,
        nombre: alumno.usuario.nombre,
        apellido_paterno: alumno.usuario.apellidoPaterno,
        apellido_materno: alumno.usuario.apellidoMaterno,
        correo: alumno.usuario.correo,
      };
    });
    return {
      success: true,
      message: 'Token consumido exitosamente, alumno vinculado al entrenador',
      data: resultado,
    };
  }
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
