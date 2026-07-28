import { Injectable } from '@nestjs/common';
import { RutinaEjercicioDto } from './dto/rutina-ejercicio.dto';
import { CreateRutinaDto } from './dto/create-rutina.dto';
import { AsignarRutinaDto } from './dto/asignar-rutina.dto';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class RutinasService {
  constructor(private readonly prisma: PrismaService) {}
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
    const fechaInicio = asignarRutinaDto.fecha_inicio
      ? new Date(asignarRutinaDto.fecha_inicio)
      : new Date();
    const fechaFin = asignarRutinaDto.fecha_fin ? new Date(asignarRutinaDto.fecha_fin) : null;
    await this.prisma.usuarioRutina.create({
      data: {
        idRutina: id_rutina,
        idUsuario: asignarRutinaDto.id_alumno,
        idDiaSemana: asignarRutinaDto.numero_dia,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        asignadaPorUsuario: asignarRutinaDto.asignada_por_usuario,
      },
    });
    return { success: true, message: 'Rutina asignada al alumno exitosamente' };
  }
}
