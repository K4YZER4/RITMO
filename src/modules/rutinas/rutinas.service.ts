import { Injectable } from '@nestjs/common';
import { RutinaEjercicioDto } from './dto/rutina-ejercicio.dto';
import { CreateRutinaDto } from './dto/create-rutina.dto';
import { AsignarRutinaDto } from './dto/asignar-rutina.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
@Injectable()
export class RutinasService {
  constructor(private readonly prisma: PrismaService) {}
  //
  // Create routine method
  //
  async create(createRutinaDto: CreateRutinaDto, usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }
    if (usuario.role === UserRole.admin || usuario.role === UserRole.alumnoConEntrenador) {
      throw new BadRequestException('No tienes permisos para crear rutinas');
    }
    if (usuario.role === UserRole.entrenador) {
      const entrenador = await this.prisma.entrenador.findUnique({
        where: { idUsuario: usuarioId },
      });
      if (!entrenador) {
        throw new BadRequestException('Entrenador no encontrado');
      }
      const planEntrenador = await this.prisma.planEntrenador.findFirst({
        where: { id: entrenador.idPlan },
      });
      if (!planEntrenador || planEntrenador.estaActivo === false) {
        throw new BadRequestException('Plan del entrenador no encontrado o inactivo');
      }
      const cantidadRutinas = await this.prisma.rutina.count({
        where: { createdByUsuario: usuarioId },
      });
      if (cantidadRutinas >= planEntrenador.limiteRutinas) {
        throw new BadRequestException(
          `Has alcanzado el límite de rutinas permitidas por tu plan (${planEntrenador.limiteRutinas})`,
        );
      }
    }
    if (usuario.role === UserRole.alumno) {
      const alumno = await this.prisma.alumno.findUnique({
        where: { idUsuario: usuarioId },
      });
      if (!alumno) {
        throw new BadRequestException('Alumno no encontrado');
      }
      const planAlumno = await this.prisma.planAlumno.findFirst({
        where: { id: alumno.idPlan },
      });
      if (!planAlumno || planAlumno.estaActivo === false) {
        throw new BadRequestException('Plan del alumno no encontrado o inactivo');
      }
      const cantidadRutinas = await this.prisma.rutina.count({
        where: { createdByUsuario: usuarioId },
      });
      if (cantidadRutinas >= planAlumno.limiteRutinas) {
        throw new BadRequestException(
          `Has alcanzado el límite de rutinas permitidas por tu plan (${planAlumno.limiteRutinas})`,
        );
      }
    }
    await this.prisma.rutina.create({
      data: {
        createdByUsuario: usuarioId,
        nombre: createRutinaDto.nombre,
        descripcion: createRutinaDto.descripcion,
        idCategoriaRutina: createRutinaDto.id_categoria_rutina,
      },
    });
    return { success: true, message: 'Rutina creada exitosamente' };
  }
  //
  // Update routine exercises method
  //
  async updateRutinaEjercicios(id_rutina: bigint, rutinaEjercicioDto: RutinaEjercicioDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rutinaEjercicio.deleteMany({
        where: {
          idRutina: id_rutina,
        },
      });
      for (const ejercicio of rutinaEjercicioDto.ejercicios) {
        await tx.rutinaEjercicio.create({
          data: {
            idRutina: id_rutina,
            idEjercicioEstandar: ejercicio.id_ejercicio_estandar,
            idEjercicioPersonalizado: ejercicio.id_ejercicio_personalizado,
            orden: ejercicio.orden,
            series: ejercicio.series,
            repeticiones: ejercicio.repeticiones,
            pesoObjetivo: ejercicio.peso_objetivo,
            notaEntrenador: ejercicio.nota_entrenador,
            linkApoyo: ejercicio.link_apoyo,
          },
        });
      }
    });
    return { success: true, message: 'Ejercicios de la rutina actualizados exitosamente' };
  }
  //
  // Assign routine to student method
  //
  async asignarRutinaAAlumno(
    id_rutina: bigint,
    asignarRutinaDto: AsignarRutinaDto,
    usuarioId: string,
  ) {
    const fechaInicio = new Date(asignarRutinaDto.fecha_inicio);
    const fechaFin = asignarRutinaDto.fecha_fin ? new Date(asignarRutinaDto.fecha_fin) : null;

    const fechaFinComparacion = fechaFin ?? new Date('9999-12-31');

    await this.prisma.$transaction(
      async (tx) => {
        const rutina = await tx.rutina.findUnique({
          where: { id: id_rutina },
        });
        if (!rutina || rutina.createdByUsuario !== usuarioId) {
          throw new ForbiddenException('No tienes permiso para asignar esta rutina');
        }
        const alumno = await tx.usuario.findUnique({
          where: { id: asignarRutinaDto.id_alumno },
        });
        if (!alumno || alumno.role !== UserRole.alumno) {
          throw new ForbiddenException('El usuario destino no es un alumno válido');
        }

        const conflictos = await tx.usuarioRutina.findMany({
          where: {
            idUsuario: asignarRutinaDto.id_alumno,
            idDiaSemana: asignarRutinaDto.numero_dia,
            fechaInicio: {
              lte: fechaFinComparacion,
            },
            OR: [{ fechaFin: null }, { fechaFin: { gte: fechaInicio } }],
          },
          orderBy: {
            fechaInicio: 'asc',
          },
        });

        for (const conflicto of conflictos) {
          const conflictoInicio = conflicto.fechaInicio;
          const conflictoFin = conflicto.fechaFin;

          const nuevaEmpiezaDespuesDelConflicto =
            conflictoFin !== null && fechaInicio > conflictoFin;

          if (nuevaEmpiezaDespuesDelConflicto) {
            continue;
          }

          const conflictoEsRecortable =
            conflictoInicio < fechaInicio && (conflictoFin === null || conflictoFin >= fechaInicio);

          if (conflictoEsRecortable) {
            const nuevaFechaFinConflicto = new Date(fechaInicio);
            nuevaFechaFinConflicto.setDate(nuevaFechaFinConflicto.getDate() - 1);

            if (conflictoFin !== null && nuevaFechaFinConflicto > conflictoFin) {
              continue;
            }

            await tx.usuarioRutina.update({
              where: { id: conflicto.id },
              data: {
                fechaFin: nuevaFechaFinConflicto,
              },
            });

            continue;
          }

          throw new BadRequestException(
            'La rutina se traslapa con otra asignación ya registrada para ese día',
          );
        }

        await tx.usuarioRutina.create({
          data: {
            idRutina: id_rutina,
            idUsuario: asignarRutinaDto.id_alumno,
            idDiaSemana: asignarRutinaDto.numero_dia,
            fechaInicio,
            fechaFin,
            asignadaPorUsuario: usuarioId,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return { success: true, message: 'Rutina asignada al alumno exitosamente' };
  }
}
