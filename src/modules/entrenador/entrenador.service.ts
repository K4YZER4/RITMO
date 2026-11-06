import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntrenadorService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerResumen(entrenadorId: string) {
    await this.validarEntrenador(entrenadorId);

    const [alumnos, rutinas, sesionesCompletadas] = await Promise.all([
      this.prisma.alumno.count({ where: { idEntrenadorActual: entrenadorId } }),
      this.prisma.rutina.count({ where: { createdByUsuario: entrenadorId, activa: true } }),
      this.prisma.sesionEntrenamiento.count({
        where: {
          usuario: { alumno: { idEntrenadorActual: entrenadorId } },
          estado: { nombre: { equals: 'completada', mode: 'insensitive' } },
        },
      }),
    ]);

    return { alumnos, rutinas, sesionesCompletadas };
  }

  async listarAlumnos(entrenadorId: string) {
    await this.validarEntrenador(entrenadorId);

    return this.prisma.alumno.findMany({
      where: { idEntrenadorActual: entrenadorId },
      orderBy: { usuario: { nombre: 'asc' } },
      select: {
        idUsuario: true,
        fechaInicioEntrenamiento: true,
        usuario: {
          select: {
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            correo: true,
            role: true,
            _count: { select: { usuarioRutina: true, sesionEntrenamiento: true } },
            usuarioMedicion: {
              orderBy: { fechaMedicion: 'desc' },
              take: 1,
              select: { fechaMedicion: true, pesoKg: true },
            },
          },
        },
        objetivo: { select: { id: true, nombre: true } },
        nivelActividad: { select: { id: true, nombre: true } },
      },
    });
  }

  async obtenerAlumno(entrenadorId: string, alumnoId: string) {
    await this.validarEntrenador(entrenadorId);

    const alumno = await this.prisma.alumno.findFirst({
      where: { idUsuario: alumnoId, idEntrenadorActual: entrenadorId },
      select: {
        idUsuario: true,
        numeroCelular: true,
        fechaInicioEntrenamiento: true,
        observacionesMedicas: true,
        lesionesActuales: true,
        lesionesPasadas: true,
        contactoEmergenciaNombre: true,
        contactoEmergenciaTelefono: true,
        usuario: {
          select: {
            nombre: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            correo: true,
            fechaNacimiento: true,
            usuarioMedicion: { orderBy: { fechaMedicion: 'desc' }, take: 12 },
            usuarioRutina: {
              where: { activa: true },
              include: { rutina: true, diaSemana: true },
              orderBy: { fechaInicio: 'desc' },
            },
          },
        },
        objetivo: true,
        nivelActividad: true,
      },
    });

    if (!alumno) {
      throw new NotFoundException('Alumno vinculado no encontrado');
    }

    return alumno;
  }

  private async validarEntrenador(usuarioId: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { role: true },
    });

    if (!usuario || usuario.role !== UserRole.entrenador) {
      throw new ForbiddenException('Esta operación requiere una cuenta de entrenador');
    }
  }
}
