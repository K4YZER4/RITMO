import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEjercicioPersonalizadoDto } from './dto/create-ejercicio.dto';
import { DeleteEjercicioDto } from './dto/delete-ejercicio.dto';
import { UpdateEjercicioPersonalizadoDto } from './dto/update-ejercicio.dto';
import { UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotFoundException, UnauthorizedException } from '@nestjs/common/exceptions';
@Injectable()
export class EjerciciosService {
  constructor(private prisma: PrismaService) {}

  async createEjercicioPersonalizado(
    createEjercicioPersonalizadoDto: CreateEjercicioPersonalizadoDto,
  ) {
    const ejercicioPersonalizado = await this.prisma.$transaction(async (tx) => {
      await this.validarCantidadEjerciciosAlumno(
        createEjercicioPersonalizadoDto.created_by_usuario,
        tx,
      );
      const ejercicioPersonalizado = await tx.ejercicioPersonalizado.create({
        data: {
          createdByUsuario: createEjercicioPersonalizadoDto.created_by_usuario,
          nombre: createEjercicioPersonalizadoDto.nombre,
          descripcion: createEjercicioPersonalizadoDto.descripcion,
          urlImagen: createEjercicioPersonalizadoDto.url_imagen,
          linkInformacion: createEjercicioPersonalizadoDto.link_informacion,
          activa: createEjercicioPersonalizadoDto.activa ?? true,
        },
      });
      if (createEjercicioPersonalizadoDto.musculos.length > 0) {
        await tx.ejercicioPersonalizadoMusculo.createMany({
          data: createEjercicioPersonalizadoDto.musculos.map((idMusculo) => ({
            idEjercicioPersonalizado: ejercicioPersonalizado.id,
            idMusculo: idMusculo,
          })),
        });
      }
      if (
        createEjercicioPersonalizadoDto.equipos !== undefined &&
        createEjercicioPersonalizadoDto.equipos.length > 0
      ) {
        await tx.ejercicioPersonalizadoEquipo.createMany({
          data: createEjercicioPersonalizadoDto.equipos.map((idEquipo) => ({
            idEjercicioPersonalizado: ejercicioPersonalizado.id,
            idEquipo: idEquipo,
          })),
        });
      }
      return ejercicioPersonalizado;
    });
    return {
      success: true,
      message: 'Ejercicio personalizado creado exitosamente',
      data: {
        id: ejercicioPersonalizado.id.toString(),
      },
    };
  }
  //
  // Delete method
  //
  async deleteEjercicioPersonalizado(deleteEjercicioDto: DeleteEjercicioDto, id: number) {
    await this.prisma.ejercicioPersonalizado.update({
      where: {
        id: id,
        createdByUsuario: deleteEjercicioDto.created_by_usuario,
      },
      data: {
        activa: false,
      },
    });
    return {
      success: true,
      message: 'Ejercicio personalizado desactivado exitosamente',
    };
  }
  //
  // Update method
  //
  async updateEjercicioPersonalizado(
    updateEjercicioPersonalizadoDto: UpdateEjercicioPersonalizadoDto,
    id: number,
  ) {
    await this.prisma.ejercicioPersonalizado.update({
      where: {
        id: id,
        createdByUsuario: updateEjercicioPersonalizadoDto.created_by_usuario,
      },
      data: {
        nombre: updateEjercicioPersonalizadoDto.nombre,
        descripcion: updateEjercicioPersonalizadoDto.descripcion,
        urlImagen: updateEjercicioPersonalizadoDto.url_imagen,
        linkInformacion: updateEjercicioPersonalizadoDto.link_informacion,
        activa: updateEjercicioPersonalizadoDto.activa,
      },
    });
    if (updateEjercicioPersonalizadoDto.musculos.length > 0) {
      await this.prisma.ejercicioPersonalizadoMusculo.deleteMany({
        where: {
          idEjercicioPersonalizado: id,
        },
      });
    }
    if (
      updateEjercicioPersonalizadoDto.equipos !== undefined &&
      updateEjercicioPersonalizadoDto.equipos.length > 0
    ) {
      await this.prisma.ejercicioPersonalizadoEquipo.deleteMany({
        where: {
          idEjercicioPersonalizado: id,
        },
      });
    }
    if (updateEjercicioPersonalizadoDto.musculos.length > 0) {
      await this.prisma.ejercicioPersonalizadoMusculo.createMany({
        data: updateEjercicioPersonalizadoDto.musculos.map((idMusculo) => ({
          idEjercicioPersonalizado: id,
          idMusculo: idMusculo,
        })),
      });
    }
    if (
      updateEjercicioPersonalizadoDto.equipos !== undefined &&
      updateEjercicioPersonalizadoDto.equipos.length > 0
    ) {
      await this.prisma.ejercicioPersonalizadoEquipo.createMany({
        data: updateEjercicioPersonalizadoDto.equipos.map((idEquipo) => ({
          idEjercicioPersonalizado: id,
          idEquipo: idEquipo,
        })),
      });
    }
    return {
      success: true,
      message: 'Ejercicio personalizado actualizado exitosamente',
    };
  }
  async validarCantidadEjerciciosAlumno(idUsuario: string, tx: Prisma.TransactionClient) {
    const usuarioAlumno = await tx.usuario.findUnique({
      where: {
        id: idUsuario,
      },
    });
    if (!usuarioAlumno) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!(usuarioAlumno.role === UserRole.entrenador)) {
      if (usuarioAlumno.role == UserRole.alumno_con_entrenador) {
        throw new UnauthorizedException(
          'Alumnos con entrenador no pueden crear ejercicios personalizados',
        );
      }
      if (usuarioAlumno.role !== UserRole.alumno) {
        throw new UnauthorizedException('Usuario no es un alumno');
      }
      const alumno = await tx.alumno.findUnique({
        where: {
          idUsuario: idUsuario,
        },
      });
      if (!alumno) {
        throw new NotFoundException('Alumno no encontrado');
      }
      const cantidadEjercicios = await tx.ejercicioPersonalizado.count({
        where: {
          createdByUsuario: idUsuario,
        },
      });
      const planAlumno = await tx.planAlumno.findFirst({
        where: {
          id: alumno.idPlan,
        },
      });
      if (!planAlumno) {
        throw new NotFoundException('Plan del alumno no encontrado');
      }
      if (cantidadEjercicios >= planAlumno.limiteEjerciciosPersonalizados) {
        throw new UnauthorizedException(
          'El alumno ha alcanzado el límite de ejercicios personalizados',
        );
      }
    }
  }
}
