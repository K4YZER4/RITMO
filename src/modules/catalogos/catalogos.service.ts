import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerCatalogos() {
    const [
      sexos,
      objetivos,
      nivelesActividad,
      categoriasRutina,
      musculos,
      equipos,
      diasSemana,
      planesAlumno,
      planesEntrenador,
    ] = await Promise.all([
      this.prisma.sexo.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.objetivo.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } }),
      this.prisma.nivelActividad.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
      }),
      this.prisma.categoriaRutina.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.musculo.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.equipo.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.diaSemana.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.planAlumno.findMany({
        where: { estaActivo: true },
        orderBy: { precio: 'asc' },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          precio: true,
          moneda: true,
          limiteEjerciciosPersonalizados: true,
          limiteRutinas: true,
          periodoPrueba: true,
          esGratuito: true,
          esVitalicio: true,
        },
      }),
      this.prisma.planEntrenador.findMany({
        where: { estaActivo: true },
        orderBy: { precio: 'asc' },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          precio: true,
          moneda: true,
          limiteAlumnos: true,
          limiteRutinas: true,
          periodoPrueba: true,
          esGratuito: true,
          esVitalicio: true,
        },
      }),
    ]);

    return {
      sexos,
      objetivos,
      nivelesActividad,
      categoriasRutina,
      musculos,
      equipos,
      diasSemana,
      planesAlumno,
      planesEntrenador,
    };
  }
}
