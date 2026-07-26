import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEjercicioPersonalizadoDto } from './dto/create-ejercicio.dto';
import { DeleteEjercicioDto } from './dto/delete-ejercicio.dto';
import { UpdateEjercicioPersonalizadoDto } from './dto/update-ejercicio.dto';
@Injectable()
export class EjerciciosService {
  constructor(private prisma: PrismaService) {}

  async createEjercicioPersonalizado(
    createEjercicioPersonalizadoDto: CreateEjercicioPersonalizadoDto,
  ) {
    const ejercicioPersonalizado = await this.prisma.ejercicioPersonalizado.create({
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
      await this.prisma.ejercicioPersonalizadoMusculo.createMany({
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
      await this.prisma.ejercicioPersonalizadoEquipo.createMany({
        data: createEjercicioPersonalizadoDto.equipos.map((idEquipo) => ({
          idEjercicioPersonalizado: ejercicioPersonalizado.id,
          idEquipo: idEquipo,
        })),
      });
    }
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
}
