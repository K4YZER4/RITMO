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
            sesionEntrenamiento: {
              orderBy: { fechaSesion: 'desc' },
              take: 20,
              include: {
                estado: true,
                rutina: { select: { id: true, nombre: true } },
                _count: { select: { sesionEjercicio: true } },
              },
            },
            alumnoEjercicioPr: {
              orderBy: { fechaPr: 'desc' },
              take: 10,
              include: { ejercicioEstandar: true, ejercicioPersonalizado: true },
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

  async obtenerProgresoAlumno(entrenadorId: string, alumnoId: string) {
    await this.validarEntrenador(entrenadorId);
    const alumno = await this.prisma.alumno.findFirst({
      where: { idUsuario: alumnoId, idEntrenadorActual: entrenadorId },
      select: { idUsuario: true },
    });
    if (!alumno) throw new NotFoundException('Alumno vinculado no encontrado');

    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 30);
    const sesiones = await this.prisma.sesionEntrenamiento.findMany({
      where: { idUsuario: alumnoId, idEstado: 2, fechaSesion: { gte: desde } },
      include: {
        sesionEjercicio: { include: { sesionEjercicioSet: { where: { completado: true } } } },
      },
    });
    const volumen = sesiones.reduce(
      (total, sesion) =>
        total +
        sesion.sesionEjercicio.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal +
            exercise.sesionEjercicioSet.reduce(
              (setTotal, set) =>
                setTotal + Number(set.pesoReal ?? 0) * Number(set.repeticionesRealizadas ?? 0),
              0,
            ),
          0,
        ),
      0,
    );
    return { sesionesUltimos30Dias: sesiones.length, volumenUltimos30Dias: volumen };
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
