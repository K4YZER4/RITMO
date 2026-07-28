import { Injectable } from '@nestjs/common';
import { RutinaEjercicioDto } from './dto/rutina-ejercicio.dto';
import { CreateRutinaDto } from './dto/create-rutina.dto';
import { AsignarRutinaDto } from './dto/asignar-rutina.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
@Injectable()
export class RutinasService {
  constructor(private readonly prisma: PrismaService) {}
  //
  // Create routine method
  //
  async create(createRutinaDto: CreateRutinaDto) {
    await this.prisma.rutina.create({
      data: {
        createdByUsuario: createRutinaDto.created_by_usuario,
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
  async updateRutinaEjercicios(id_rutina: number, rutinaEjercicioDto: RutinaEjercicioDto) {
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
  async asignarRutinaAAlumno(id_rutina: number, asignarRutinaDto: AsignarRutinaDto) {
    const fechaInicio = new Date(asignarRutinaDto.fecha_inicio);
    const fechaFin = asignarRutinaDto.fecha_fin ? new Date(asignarRutinaDto.fecha_fin) : null;

    const fechaFinComparacion = fechaFin ?? new Date('9999-12-31');

    await this.prisma.$transaction(
      async (tx) => {
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
            asignadaPorUsuario: asignarRutinaDto.asignada_por_usuario,
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
