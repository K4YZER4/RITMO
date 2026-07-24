import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEjercicioPersonalizadoDto } from './dto/create-ejercicio.dto';
import { DeleteEjercicioDto } from './dto/delete-ejercicio.dto';
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
    return ejercicioPersonalizado;
  }
  //
  // Delete method
  //
  async deleteEjercicioPersonalizado(deleteEjercicioDto: DeleteEjercicioDto) {
    await this.prisma.ejercicioPersonalizado.delete({
      where: {
        id: deleteEjercicioDto.id,
        createdByUsuario: deleteEjercicioDto.created_by_usuario,
      },
    });
    return {
      success: true,
      message: 'Ejercicio personalizado desactivado exitosamente',
    };
  }
}
