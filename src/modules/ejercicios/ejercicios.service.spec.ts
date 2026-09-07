import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { EjerciciosService } from './ejercicios.service';
import { PrismaService } from '../../prisma/prisma.service';

const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

const transactionMock = {
  usuario: {
    findUnique: jest.fn(),
  },
  alumno: {
    findUnique: jest.fn(),
  },
  ejercicioPersonalizado: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  ejercicioPersonalizadoMusculo: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  ejercicioPersonalizadoEquipo: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  planAlumno: {
    findFirst: jest.fn(),
  },
};

const transactionClientMock = transactionMock as unknown as Prisma.TransactionClient;

const prismaMock = {
  $transaction: jest.fn(),
  ejercicioPersonalizado: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('EjerciciosService', () => {
  let service: EjerciciosService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionClientMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EjerciciosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<EjerciciosService>(EjerciciosService);
  });

  describe('createEjercicioPersonalizado', () => {
    const dto = {
      nombre: 'Press de banca',
      descripcion: 'Ejercicio de pecho',
      url_imagen: 'https://img.com/press.png',
      link_informacion: 'https://info.com/press',
      activa: true,
      musculos: [BigInt(1), BigInt(2)],
      equipos: [BigInt(3)],
    };

    it('debe crear un ejercicio personalizado con sus relaciones', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: 1,
      });
      transactionMock.ejercicioPersonalizado.count.mockResolvedValue(0);
      transactionMock.planAlumno.findFirst.mockResolvedValue({
        id: 1,
        limiteEjerciciosPersonalizados: 10,
      });
      transactionMock.ejercicioPersonalizado.create.mockResolvedValue({
        id: BigInt(5),
      });

      const result = await service.createEjercicioPersonalizado(dto, usuarioId);

      expect(transactionMock.ejercicioPersonalizado.create).toHaveBeenCalledWith({
        data: {
          createdByUsuario: usuarioId,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          urlImagen: dto.url_imagen,
          linkInformacion: dto.link_informacion,
          activa: true,
        },
      });
      expect(transactionMock.ejercicioPersonalizadoMusculo.createMany).toHaveBeenCalledWith({
        data: dto.musculos.map((idMusculo) => ({
          idEjercicioPersonalizado: BigInt(5),
          idMusculo,
        })),
      });
      expect(transactionMock.ejercicioPersonalizadoEquipo.createMany).toHaveBeenCalledWith({
        data: dto.equipos.map((idEquipo) => ({
          idEjercicioPersonalizado: BigInt(5),
          idEquipo,
        })),
      });
      expect(result).toEqual({
        success: true,
        message: 'Ejercicio personalizado creado exitosamente',
        data: { id: '5' },
      });
    });

    it('debe lanzar ForbiddenException si el alumno alcanzó el límite de ejercicios', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumno,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: usuarioId,
        idPlan: 1,
      });
      transactionMock.ejercicioPersonalizado.count.mockResolvedValue(10);
      transactionMock.planAlumno.findFirst.mockResolvedValue({
        id: 1,
        limiteEjerciciosPersonalizados: 10,
      });

      await expect(service.createEjercicioPersonalizado(dto, usuarioId)).rejects.toThrow(
        new ForbiddenException('El alumno ha alcanzado el límite de ejercicios personalizados'),
      );

      expect(transactionMock.ejercicioPersonalizado.create).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si el alumno tiene entrenador', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: usuarioId,
        role: UserRole.alumnoConEntrenador,
      });

      await expect(service.createEjercicioPersonalizado(dto, usuarioId)).rejects.toThrow(
        new ForbiddenException('Alumnos con entrenador no pueden crear ejercicios personalizados'),
      );
    });
  });

  describe('deleteEjercicioPersonalizado', () => {
    it('debe desactivar un ejercicio del que el usuario es dueño', async () => {
      prismaMock.ejercicioPersonalizado.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: usuarioId,
      });
      prismaMock.ejercicioPersonalizado.update.mockResolvedValue({});

      const result = await service.deleteEjercicioPersonalizado(BigInt(5), usuarioId);

      expect(prismaMock.ejercicioPersonalizado.update).toHaveBeenCalledWith({
        where: { id: BigInt(5), createdByUsuario: usuarioId, activa: true },
        data: { activa: false },
      });
      expect(result).toEqual({
        success: true,
        message: 'Ejercicio personalizado desactivado exitosamente',
      });
    });

    it('debe lanzar NotFoundException si el ejercicio no existe', async () => {
      prismaMock.ejercicioPersonalizado.findUnique.mockResolvedValue(null);

      await expect(service.deleteEjercicioPersonalizado(BigInt(5), usuarioId)).rejects.toThrow(
        new NotFoundException('Ejercicio personalizado no encontrado'),
      );
    });

    it('debe lanzar ForbiddenException si el usuario no es dueño', async () => {
      prismaMock.ejercicioPersonalizado.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: 'otro-usuario',
      });

      await expect(service.deleteEjercicioPersonalizado(BigInt(5), usuarioId)).rejects.toThrow(
        new ForbiddenException('No tienes permiso para eliminar este ejercicio personalizado'),
      );
    });
  });

  describe('updateEjercicioPersonalizado', () => {
    const dto = {
      nombre: 'Press militar',
      descripcion: 'Ejercicio de hombro',
      url_imagen: 'https://img.com/military.png',
      link_informacion: null,
      activa: true,
      musculos: [BigInt(4)],
      equipos: [],
    };

    it('debe actualizar el ejercicio y sus relaciones de forma atómica', async () => {
      transactionMock.ejercicioPersonalizado.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: usuarioId,
      });
      transactionMock.ejercicioPersonalizado.update.mockResolvedValue({});

      const result = await service.updateEjercicioPersonalizado(dto, BigInt(5), usuarioId);

      expect(transactionMock.ejercicioPersonalizado.update).toHaveBeenCalledWith({
        where: { id: BigInt(5) },
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          urlImagen: dto.url_imagen,
          linkInformacion: dto.link_informacion,
          activa: dto.activa,
        },
      });
      expect(transactionMock.ejercicioPersonalizadoMusculo.deleteMany).toHaveBeenCalledWith({
        where: { idEjercicioPersonalizado: BigInt(5) },
      });
      expect(transactionMock.ejercicioPersonalizadoEquipo.deleteMany).toHaveBeenCalledWith({
        where: { idEjercicioPersonalizado: BigInt(5) },
      });
      expect(transactionMock.ejercicioPersonalizadoMusculo.createMany).toHaveBeenCalledWith({
        data: dto.musculos.map((idMusculo) => ({
          idEjercicioPersonalizado: BigInt(5),
          idMusculo,
        })),
      });
      expect(result).toEqual({
        success: true,
        message: 'Ejercicio personalizado actualizado exitosamente',
      });
    });

    it('debe lanzar NotFoundException si el ejercicio no existe', async () => {
      transactionMock.ejercicioPersonalizado.findUnique.mockResolvedValue(null);

      await expect(service.updateEjercicioPersonalizado(dto, BigInt(5), usuarioId)).rejects.toThrow(
        new NotFoundException('Ejercicio personalizado no encontrado'),
      );

      expect(transactionMock.ejercicioPersonalizado.update).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si el usuario no es dueño', async () => {
      transactionMock.ejercicioPersonalizado.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: 'otro-usuario',
      });

      await expect(service.updateEjercicioPersonalizado(dto, BigInt(5), usuarioId)).rejects.toThrow(
        new ForbiddenException('No tienes permiso para modificar este ejercicio personalizado'),
      );
    });
  });
});
