import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPerfil(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        role: true,
        nombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        correo: true,
        fechaNacimiento: true,
        fechaRegistro: true,
        sexo: { select: { id: true, nombre: true } },
        alumno: {
          select: {
            numeroCelular: true,
            fechaInicioEntrenamiento: true,
            observacionesMedicas: true,
            lesionesActuales: true,
            lesionesPasadas: true,
            contactoEmergenciaNombre: true,
            contactoEmergenciaTelefono: true,
            objetivo: true,
            nivelActividad: true,
            plan: {
              select: {
                id: true,
                nombre: true,
                limiteRutinas: true,
                limiteEjerciciosPersonalizados: true,
              },
            },
            entrenadorActual: {
              select: {
                idUsuario: true,
                slug: true,
                nombrePublico: true,
                usuario: {
                  select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true },
                },
              },
            },
          },
        },
        entrenador: {
          select: {
            slug: true,
            nombrePublico: true,
            fechaEntrenador: true,
            verificacionStatus: true,
            plan: {
              select: { id: true, nombre: true, limiteAlumnos: true, limiteRutinas: true },
            },
            tema: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async actualizarPerfil(usuarioId: string, dto: ActualizarPerfilDto) {
    await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUnique({
        where: { id: usuarioId },
        select: { role: true },
      });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      const { nombre_publico } = dto;
      const datosUsuario = {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.apellido_paterno !== undefined ? { apellidoPaterno: dto.apellido_paterno } : {}),
        ...(dto.apellido_materno !== undefined ? { apellidoMaterno: dto.apellido_materno } : {}),
      };
      if (Object.keys(datosUsuario).length) {
        await tx.usuario.update({ where: { id: usuarioId }, data: datosUsuario });
      }
      if (nombre_publico !== undefined && usuario.role === 'entrenador') {
        await tx.entrenador.update({
          where: { idUsuario: usuarioId },
          data: { nombrePublico: nombre_publico },
        });
      }
    });
    return this.obtenerPerfil(usuarioId);
  }
}
