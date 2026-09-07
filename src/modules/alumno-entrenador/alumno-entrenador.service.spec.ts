import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { validate as uuidValidate } from 'uuid';
import { AlumnoEntrenadorService } from './alumno-entrenador.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('uuid', () => ({
  validate: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AlumnoEntrenadorService', () => {
  let service: AlumnoEntrenadorService;

  const entrenadorId = 'b12e4567-e89b-12d3-a456-426614174000';
  const alumnoId = 'a12e4567-e89b-12d3-a456-426614174000';
  const fechaExpiracion = new Date('2026-08-20T21:00:00.000Z');
  const fechaActual = new Date('2026-08-20T20:30:00.000Z');

  const transactionMock = {
    alumno: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entrenador: {
      findUnique: jest.fn(),
    },
    planEntrenador: {
      findUnique: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tokenVinculacionAlumno: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    alumnoEntrenadorHistorial: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const transactionClientMock = transactionMock as unknown as Prisma.TransactionClient;

  const prismaMock = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fechaActual);

    const randomBytesMock = jest.mocked(crypto.randomBytes);

    randomBytesMock
      .mockReturnValueOnce({
        toString: jest.fn().mockReturnValue('ab12cd34'),
      } as never)
      .mockReturnValueOnce({
        toString: jest.fn().mockReturnValue('secreto-hexadecimal'),
      } as never);

    const digestMock = jest.fn().mockReturnValue('hash-fijo');
    const updateMock = jest.fn().mockReturnValue({ digest: digestMock });
    jest.mocked(crypto.createHash).mockReturnValue({ update: updateMock } as never);

    jest.mocked(bcrypt.compare).mockResolvedValue(true);
    jest.mocked(uuidValidate).mockReturnValue(true);

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(transactionClientMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlumnoEntrenadorService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AlumnoEntrenadorService>(AlumnoEntrenadorService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validatePLanYAlumnosLimites', () => {
    it('debe permitir vincular alumno cuando el entrenador aún tiene cupos', async () => {
      transactionMock.alumno.count.mockResolvedValue(2);
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      transactionMock.planEntrenador.findUnique.mockResolvedValue({
        id: 1,
        limiteAlumnos: 5,
      });

      await expect(
        service.validatePLanYAlumnosLimites(entrenadorId, transactionClientMock),
      ).resolves.toBeUndefined();

      expect(transactionMock.alumno.count).toHaveBeenCalledWith({
        where: {
          idEntrenadorActual: entrenadorId,
        },
      });
      expect(transactionMock.entrenador.findUnique).toHaveBeenCalledWith({
        where: {
          idUsuario: entrenadorId,
        },
      });
      expect(transactionMock.planEntrenador.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('debe lanzar UnauthorizedException si no existe el entrenador', async () => {
      transactionMock.alumno.count.mockResolvedValue(0);
      transactionMock.entrenador.findUnique.mockResolvedValue(null);

      await expect(
        service.validatePLanYAlumnosLimites(entrenadorId, transactionClientMock),
      ).rejects.toThrow(new UnauthorizedException('Entrenador no encontrado'));

      expect(transactionMock.planEntrenador.findUnique).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si no existe el plan del entrenador', async () => {
      transactionMock.alumno.count.mockResolvedValue(0);
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      transactionMock.planEntrenador.findUnique.mockResolvedValue(null);

      await expect(
        service.validatePLanYAlumnosLimites(entrenadorId, transactionClientMock),
      ).rejects.toThrow(new UnauthorizedException('Plan del entrenador no encontrado'));
    });

    it('debe lanzar UnauthorizedException cuando el plan ya alcanzó el límite de alumnos', async () => {
      transactionMock.alumno.count.mockResolvedValue(5);
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      transactionMock.planEntrenador.findUnique.mockResolvedValue({
        id: 1,
        limiteAlumnos: 5,
      });

      await expect(
        service.validatePLanYAlumnosLimites(entrenadorId, transactionClientMock),
      ).rejects.toThrow(
        new UnauthorizedException('El entrenador ha alcanzado el límite de alumnos para su plan'),
      );
    });
  });

  describe('generarTokenAlumno', () => {
    it('debe generar y guardar un token para un alumno válido sin token activo previo', async () => {
      const codigo = 'AB12CD34';
      const secreto = 'secreto-hexadecimal';
      const codigoHash = 'codigo-hash';
      const secretoHash = 'secreto-hash';
      const randomBytesMock = jest.mocked(crypto.randomBytes);
      const createHashMock = jest.mocked(crypto.createHash);
      const digestMock = jest.fn();
      const updateMock = jest.fn().mockReturnValue({ digest: digestMock });

      randomBytesMock
        .mockReturnValueOnce({ toString: jest.fn().mockReturnValue('ab12cd34') } as never)
        .mockReturnValueOnce({ toString: jest.fn().mockReturnValue(secreto) } as never);
      createHashMock.mockReturnValue({ update: updateMock } as never);
      digestMock.mockReturnValueOnce(codigoHash).mockReturnValueOnce(secretoHash);

      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
      });
      transactionMock.tokenVinculacionAlumno.findFirst.mockResolvedValue(null);
      transactionMock.tokenVinculacionAlumno.create.mockResolvedValue({
        id: BigInt(1),
        expiraEn: fechaExpiracion,
      });

      const resultado = await service.generarTokenAlumno(alumnoId);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(transactionMock.usuario.findUnique).toHaveBeenCalledWith({
        where: {
          id: alumnoId,
        },
      });
      expect(transactionMock.alumno.findUnique).toHaveBeenCalledWith({
        where: {
          idUsuario: alumnoId,
        },
      });
      expect(transactionMock.tokenVinculacionAlumno.findFirst).toHaveBeenCalledWith({
        where: {
          idAlumno: alumnoId,
          usadoEn: null,
          revocadoEn: null,
        },
      });
      expect(transactionMock.tokenVinculacionAlumno.update).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.create).toHaveBeenCalledWith({
        data: {
          idAlumno: alumnoId,
          codigoHash,
          secretoHash,
          actualizadoPor: alumnoId,
          expiraEn: new Date(fechaActual.getTime() + 30 * 60 * 1000),
        },
      });
      expect(resultado).toEqual({
        success: true,
        message: 'Token generado exitosamente',
        data: {
          codigo,
          secreto,
          expira_en: fechaExpiracion,
        },
      });
    });

    it('debe revocar el token activo previo antes de crear uno nuevo', async () => {
      const codigoHash = 'codigo-hash';
      const secretoHash = 'secreto-hash';
      const randomBytesMock = jest.mocked(crypto.randomBytes);
      const createHashMock = jest.mocked(crypto.createHash);
      const digestMock = jest.fn();
      const updateMock = jest.fn().mockReturnValue({ digest: digestMock });

      randomBytesMock
        .mockReturnValueOnce({ toString: jest.fn().mockReturnValue('ab12cd34') } as never)
        .mockReturnValueOnce({
          toString: jest.fn().mockReturnValue('secreto-hexadecimal'),
        } as never);
      createHashMock.mockReturnValue({ update: updateMock } as never);
      digestMock.mockReturnValueOnce(codigoHash).mockReturnValueOnce(secretoHash);

      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
      });
      transactionMock.tokenVinculacionAlumno.findFirst.mockResolvedValue({
        id: BigInt(9),
      });
      transactionMock.tokenVinculacionAlumno.update.mockResolvedValue({
        id: BigInt(9),
      });
      transactionMock.tokenVinculacionAlumno.create.mockResolvedValue({
        id: BigInt(10),
        expiraEn: fechaExpiracion,
      });

      await service.generarTokenAlumno(alumnoId);

      expect(transactionMock.tokenVinculacionAlumno.update).toHaveBeenCalledWith({
        where: {
          id: BigInt(9),
        },
        data: {
          revocadoEn: fechaActual,
          actualizadoEn: fechaActual,
          actualizadoPor: alumnoId,
        },
      });
      expect(transactionMock.tokenVinculacionAlumno.create).toHaveBeenCalledWith({
        data: {
          idAlumno: alumnoId,
          codigoHash,
          secretoHash,
          actualizadoPor: alumnoId,
          expiraEn: new Date(fechaActual.getTime() + 30 * 60 * 1000),
        },
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue(null);

      await expect(service.generarTokenAlumno(alumnoId)).rejects.toThrow(
        new UnauthorizedException('El usuario no es un alumno válido'),
      );

      expect(transactionMock.alumno.findUnique).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.findFirst).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.create).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el usuario no tiene rol alumno', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.entrenador,
      });

      await expect(service.generarTokenAlumno(alumnoId)).rejects.toThrow(
        new UnauthorizedException('El usuario no es un alumno válido'),
      );

      expect(transactionMock.alumno.findUnique).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.findFirst).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.create).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no existe el perfil de alumno', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });
      transactionMock.alumno.findUnique.mockResolvedValue(null);

      await expect(service.generarTokenAlumno(alumnoId)).rejects.toThrow(
        new NotFoundException('Alumno no encontrado'),
      );

      expect(transactionMock.tokenVinculacionAlumno.findFirst).not.toHaveBeenCalled();
      expect(transactionMock.tokenVinculacionAlumno.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelarMiEntrenador', () => {
    const cancelarData = { contraseña_alumno: 'password-secreta' };

    it('debe desvincular al alumno de su entrenador con contraseña válida', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumnoConEntrenador,
        hashedPassword: 'hash',
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
        idEntrenadorActual: entrenadorId,
      });

      const result = await service.cancelarMiEntrenador(cancelarData, alumnoId);

      expect(transactionMock.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: alumnoId },
      });
      expect(jest.mocked(bcrypt.compare)).toHaveBeenCalledWith(
        cancelarData.contraseña_alumno,
        'hash',
      );
      expect(transactionMock.alumnoEntrenadorHistorial.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: alumnoId, activo: true },
        data: {
          activo: false,
          fechaFin: expect.any(Date),
          motivoCambio: 'Cancelado por el alumno',
        },
      });
      expect(transactionMock.alumno.update).toHaveBeenCalledWith({
        where: { idUsuario: alumnoId },
        data: { idEntrenadorActual: null, updatedBy: alumnoId },
      });
      expect(transactionMock.usuario.update).toHaveBeenCalledWith({
        where: { id: alumnoId },
        data: { role: UserRole.alumno },
      });
      expect(result).toEqual({
        success: true,
        message: 'Alumno desvinculado de su entrenador exitosamente',
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no es alumnoConEntrenador', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumno,
      });

      await expect(service.cancelarMiEntrenador(cancelarData, alumnoId)).rejects.toThrow(
        new UnauthorizedException('Alumno no encontrado'),
      );

      expect(jest.mocked(bcrypt.compare)).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumnoConEntrenador,
        hashedPassword: 'hash',
      });
      jest.mocked(bcrypt.compare).mockResolvedValue(false);

      await expect(service.cancelarMiEntrenador(cancelarData, alumnoId)).rejects.toThrow(
        new UnauthorizedException('Contraseña incorrecta'),
      );

      expect(transactionMock.alumno.findUnique).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el alumno no tiene entrenador asignado', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: alumnoId,
        role: UserRole.alumnoConEntrenador,
        hashedPassword: 'hash',
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
        idEntrenadorActual: null,
      });

      await expect(service.cancelarMiEntrenador(cancelarData, alumnoId)).rejects.toThrow(
        new UnauthorizedException('El alumno no tiene un entrenador asignado'),
      );
    });
  });

  describe('cancelarAlumno', () => {
    const cancelarData = { contraseña_entrenador: 'password-secreta' };

    it('debe desvincular al alumno por parte del entrenador', async () => {
      transactionMock.usuario.findUnique
        .mockResolvedValueOnce({
          id: entrenadorId,
          role: UserRole.entrenador,
          hashedPassword: 'hash',
        })
        .mockResolvedValueOnce({
          id: alumnoId,
          role: UserRole.alumnoConEntrenador,
        });
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
        idEntrenadorActual: entrenadorId,
      });

      const result = await service.cancelarAlumno(cancelarData, alumnoId, entrenadorId);

      expect(jest.mocked(bcrypt.compare)).toHaveBeenCalledWith(
        cancelarData.contraseña_entrenador,
        'hash',
      );
      expect(transactionMock.alumnoEntrenadorHistorial.updateMany).toHaveBeenCalledWith({
        where: { idUsuario: alumnoId, activo: true },
        data: {
          activo: false,
          fechaFin: expect.any(Date),
          motivoCambio: 'Cancelado por el entrenador',
        },
      });
      expect(result).toEqual({ success: true, message: 'Alumno cancelado exitosamente' });
    });

    it('debe lanzar UnauthorizedException si el usuario no es entrenador', async () => {
      transactionMock.usuario.findUnique.mockResolvedValueOnce({
        id: entrenadorId,
        role: UserRole.alumno,
      });

      await expect(service.cancelarAlumno(cancelarData, alumnoId, entrenadorId)).rejects.toThrow(
        new UnauthorizedException('El usuario no es un entrenador válido'),
      );
    });

    it('debe lanzar UnauthorizedException si el entrenador no tiene asignado a este alumno', async () => {
      transactionMock.usuario.findUnique
        .mockResolvedValueOnce({
          id: entrenadorId,
          role: UserRole.entrenador,
          hashedPassword: 'hash',
        })
        .mockResolvedValueOnce({
          id: alumnoId,
          role: UserRole.alumnoConEntrenador,
        });
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
        idEntrenadorActual: 'otro-entrenador',
      });

      await expect(service.cancelarAlumno(cancelarData, alumnoId, entrenadorId)).rejects.toThrow(
        new UnauthorizedException('El entrenador no tiene asignado a este alumno'),
      );
    });
  });

  describe('consumirToken', () => {
    const consumirData = { codigo: 'AB12CD34', secreto: 'secreto' };

    it('debe vincular al alumno al entrenador con un token válido', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.entrenador,
      });
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      transactionMock.alumno.count.mockResolvedValue(2);
      transactionMock.planEntrenador.findUnique.mockResolvedValue({
        id: 1,
        limiteAlumnos: 5,
      });
      transactionMock.tokenVinculacionAlumno.findFirst.mockResolvedValue({
        id: BigInt(1),
        idAlumno: alumnoId,
        expiraEn: fechaExpiracion,
      });
      transactionMock.alumno.findUnique.mockResolvedValue({
        idUsuario: alumnoId,
        idEntrenadorActual: null,
        usuario: {
          id: alumnoId,
          role: UserRole.alumno,
          nombre: 'Ana',
          apellidoPaterno: 'Martínez',
          apellidoMaterno: 'García',
          correo: 'ana@test.com',
        },
      });

      const resultado = await service.consumirToken(consumirData, entrenadorId);

      expect(transactionMock.tokenVinculacionAlumno.findFirst).toHaveBeenCalledWith({
        where: {
          codigoHash: 'hash-fijo',
          secretoHash: 'hash-fijo',
          usadoEn: null,
          revocadoEn: null,
        },
      });
      expect(transactionMock.tokenVinculacionAlumno.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          usadoEn: expect.any(Date),
          reclamadoPorEntrenador: entrenadorId,
          actualizadoEn: expect.any(Date),
          actualizadoPor: entrenadorId,
        },
      });
      expect(transactionMock.alumno.update).toHaveBeenCalledWith({
        where: { idUsuario: alumnoId },
        data: { idEntrenadorActual: entrenadorId },
      });
      expect(transactionMock.alumnoEntrenadorHistorial.create).toHaveBeenCalledWith({
        data: {
          idUsuario: alumnoId,
          idEntrenador: entrenadorId,
          activo: true,
          createdBy: entrenadorId,
        },
      });
      expect(transactionMock.usuario.update).toHaveBeenCalledWith({
        where: { id: alumnoId },
        data: { role: UserRole.alumnoConEntrenador },
      });
      expect(resultado).toEqual({
        success: true,
        message: 'Token consumido exitosamente, alumno vinculado al entrenador',
        data: {
          id_alumno: alumnoId,
          nombre: 'Ana',
          apellido_paterno: 'Martínez',
          apellido_materno: 'García',
          correo: 'ana@test.com',
        },
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no es entrenador', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.alumno,
      });

      await expect(service.consumirToken(consumirData, entrenadorId)).rejects.toThrow(
        new UnauthorizedException('El usuario no es un entrenador válido'),
      );

      expect(transactionMock.tokenVinculacionAlumno.findFirst).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si el token no es válido', async () => {
      transactionMock.usuario.findUnique.mockResolvedValue({
        id: entrenadorId,
        role: UserRole.entrenador,
      });
      transactionMock.entrenador.findUnique.mockResolvedValue({
        idUsuario: entrenadorId,
        idPlan: 1,
      });
      transactionMock.alumno.count.mockResolvedValue(2);
      transactionMock.planEntrenador.findUnique.mockResolvedValue({
        id: 1,
        limiteAlumnos: 5,
      });
      transactionMock.tokenVinculacionAlumno.findFirst.mockResolvedValue(null);

      await expect(service.consumirToken(consumirData, entrenadorId)).rejects.toThrow(
        new UnauthorizedException('Token no válido o ya ha sido utilizado'),
      );
    });
  });
});
