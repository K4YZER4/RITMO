import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { RutinasService } from './rutinas.service';
import { PrismaService } from '../../prisma/prisma.service';

const entrenadorId = 'b12e4567-e89b-12d3-a456-426614174000';
const alumnoId = 'a12e4567-e89b-12d3-a456-426614174000';

const transactionMock = {
  usuario: {
    findUnique: jest.fn(),
  },
  rutina: {
    create: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  entrenador: {
    findUnique: jest.fn(),
  },
  planEntrenador: {
    findFirst: jest.fn(),
  },
  alumno: {
    findUnique: jest.fn(),
  },
  planAlumno: {
    findFirst: jest.fn(),
  },
  rutinaEjercicio: {
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  usuarioRutina: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

const transactionClientMock = transactionMock as unknown as Prisma.TransactionClient;

const prismaMock = {
  $transaction: jest.fn(),
  usuario: {
    findUnique: jest.fn(),
  },
  entrenador: {
    findUnique: jest.fn(),
  },
  planEntrenador: {
    findFirst: jest.fn(),
  },
  rutina: {
    create: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  alumno: {
    findUnique: jest.fn(),
  },
  planAlumno: {
    findFirst: jest.fn(),
  },
};

describe('RutinasService', () => {
  let service: RutinasService;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof transactionMock) => Promise<unknown>) =>
        callback(transactionClientMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RutinasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<RutinasService>(RutinasService);
  });

  describe('create', () => {
    const dto = { nombre: 'Push', descripcion: 'Rutina de empuje', id_categoria_rutina: 1 };

    it('debe crear una rutina si el entrenador tiene cupo en su plan', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.entrenador,
      });
      prismaMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      prismaMock.planEntrenador.findFirst.mockResolvedValue({
        id: 1,
        estaActivo: true,
        limiteRutinas: 10,
      });
      prismaMock.rutina.count.mockResolvedValue(3);

      const result = await service.create(dto, entrenadorId);

      expect(prismaMock.rutina.create).toHaveBeenCalledWith({
        data: {
          createdByUsuario: entrenadorId,
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          idCategoriaRutina: dto.id_categoria_rutina,
        },
      });
      expect(result).toEqual({ success: true, message: 'Rutina creada exitosamente' });
    });

    it('debe lanzar BadRequestException si el usuario es admin', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.admin,
      });

      await expect(service.create(dto, entrenadorId)).rejects.toThrow(
        new BadRequestException('No tienes permisos para crear rutinas'),
      );
    });

    it('debe lanzar BadRequestException si se alcanzó el límite del plan', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.entrenador,
      });
      prismaMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      prismaMock.planEntrenador.findFirst.mockResolvedValue({
        id: 1,
        estaActivo: true,
        limiteRutinas: 10,
      });
      prismaMock.rutina.count.mockResolvedValue(10);

      await expect(service.create(dto, entrenadorId)).rejects.toThrow(
        new BadRequestException('Has alcanzado el límite de rutinas permitidas por tu plan (10)'),
      );
    });
  });

  describe('updateRutinaEjercicios', () => {
    it('debe reemplazar los ejercicios de la rutina en una transacción', async () => {
      const dto = {
        ejercicios: [
          {
            id_ejercicio_estandar: BigInt(1),
            id_ejercicio_personalizado: undefined,
            orden: 1,
            series: 4,
            repeticiones: 8,
            peso_objetivo: 50,
            nota_entrenador: null,
            link_apoyo: null,
          },
        ],
      };
      transactionMock.rutinaEjercicio.deleteMany.mockResolvedValue({ count: 0 });
      transactionMock.rutinaEjercicio.create.mockResolvedValue({});

      const result = await service.updateRutinaEjercicios(BigInt(5), dto);

      expect(transactionMock.rutinaEjercicio.deleteMany).toHaveBeenCalledWith({
        where: { idRutina: BigInt(5) },
      });
      expect(transactionMock.rutinaEjercicio.create).toHaveBeenCalledWith({
        data: {
          idRutina: BigInt(5),
          idEjercicioEstandar: BigInt(1),
          idEjercicioPersonalizado: undefined,
          orden: 1,
          series: 4,
          repeticiones: 8,
          pesoObjetivo: 50,
          notaEntrenador: null,
          linkApoyo: null,
        },
      });
      expect(result).toEqual({
        success: true,
        message: 'Ejercicios de la rutina actualizados exitosamente',
      });
    });
  });

  describe('asignarRutinaAAlumno', () => {
    const dto = {
      id_alumno: alumnoId,
      numero_dia: 1,
      fecha_inicio: '2026-09-01',
      fecha_fin: null,
    };

    it('debe asignar la rutina al alumno cuando no hay conflictos', async () => {
      transactionMock.rutina.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: entrenadorId,
      });
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });
      transactionMock.usuarioRutina.findMany.mockResolvedValue([]);
      transactionMock.usuarioRutina.create.mockResolvedValue({});

      const result = await service.asignarRutinaAAlumno(BigInt(5), dto, entrenadorId);

      expect(transactionMock.usuarioRutina.create).toHaveBeenCalledWith({
        data: {
          idRutina: BigInt(5),
          idUsuario: alumnoId,
          idDiaSemana: 1,
          fechaInicio: new Date(dto.fecha_inicio),
          fechaFin: null,
          asignadaPorUsuario: entrenadorId,
        },
      });
      expect(result).toEqual({
        success: true,
        message: 'Rutina asignada al alumno exitosamente',
      });
    });

    it('debe lanzar ForbiddenException si la rutina no pertenece al entrenador', async () => {
      transactionMock.rutina.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: 'otro-entrenador',
      });

      await expect(service.asignarRutinaAAlumno(BigInt(5), dto, entrenadorId)).rejects.toThrow(
        new ForbiddenException('No tienes permiso para asignar esta rutina'),
      );
    });

    it('debe lanzar ForbiddenException si el destino no es un alumno válido', async () => {
      transactionMock.rutina.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: entrenadorId,
      });
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.entrenador,
      });

      await expect(service.asignarRutinaAAlumno(BigInt(5), dto, entrenadorId)).rejects.toThrow(
        new ForbiddenException('El usuario destino no es un alumno válido'),
      );
    });

    it('debe lanzar BadRequestException si la rutina se traslapa', async () => {
      transactionMock.rutina.findUnique.mockResolvedValue({
        id: BigInt(5),
        createdByUsuario: entrenadorId,
      });
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });
      transactionMock.usuarioRutina.findMany.mockResolvedValue([
        {
          id: BigInt(9),
          fechaInicio: new Date('2026-10-01'),
          fechaFin: null,
        },
      ]);

      await expect(service.asignarRutinaAAlumno(BigInt(5), dto, entrenadorId)).rejects.toThrow(
        new BadRequestException(
          'La rutina se traslapa con otra asignación ya registrada para ese día',
        ),
      );
    });
  });
});
