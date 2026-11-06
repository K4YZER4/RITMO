import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { DB_SEXO_IDS } from '../../common/constants/db-sexo';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

type BcryptCompareAsync = (password: string, hash: string) => Promise<boolean>;

type BcryptHashAsync = (password: string, saltOrRounds: number) => Promise<string>;

describe('AuthService', () => {
  let service: AuthService;

  const usuarioId = 'a12e4567-e89b-12d3-a456-426614174000';

  const transactionMock = {
    usuario: {
      create: jest.fn(),
    },
    entrenador: {
      create: jest.fn(),
    },
    alumno: {
      create: jest.fn(),
    },
  };

  const prismaMock = {
    usuario: {
      findUnique: jest.fn(),
    },
    planEntrenador: {
      findUnique: jest.fn(),
    },
    planAlumno: {
      findUnique: jest.fn(),
    },
    tokenRevocado: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const suscripcionesServiceMock = {
    activarSuscripcionInicial: jest.fn(),
  };

  const bcryptCompareMock = bcrypt.compare as jest.MockedFunction<BcryptCompareAsync>;

  const bcryptHashMock = bcrypt.hash as jest.MockedFunction<BcryptHashAsync>;

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.planEntrenador.findUnique.mockResolvedValue({ id: 1, estaActivo: true });

    prismaMock.planAlumno.findUnique.mockResolvedValue({ id: 1, estaActivo: true });

    suscripcionesServiceMock.activarSuscripcionInicial.mockResolvedValue({
      suscripcion: { id: 1n },
      creada: true,
    });

    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof transactionMock) => Promise<unknown>): Promise<unknown> =>
        callback(transactionMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: SuscripcionesService,
          useValue: suscripcionesServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const loginData = {
      correo: 'ana@test.com',
      password: 'password-secreta',
    };

    const userMock = {
      id: usuarioId,
      correo: 'ana@test.com',
      hashedPassword: 'hash-guardado-en-db',
      role: UserRole.alumno,
    };

    it('debe iniciar sesión y devolver token si las credenciales son válidas', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(userMock);
      bcryptCompareMock.mockResolvedValue(true);
      jwtServiceMock.sign.mockReturnValue('jwt-token-falso');

      const result = await service.login(loginData);

      expect(prismaMock.usuario.findUnique).toHaveBeenCalledWith({
        where: { correo: loginData.correo },
      });

      expect(bcryptCompareMock).toHaveBeenCalledWith(loginData.password, userMock.hashedPassword);

      expect(jwtServiceMock.sign).toHaveBeenCalledWith({
        sub: userMock.id,
        id: userMock.id,
        correo: userMock.correo,
        role: userMock.role,
        jti: expect.any(String),
      });

      expect(result).toEqual({
        message: 'Inicio de sesión exitoso',
        token: 'jwt-token-falso',
      });
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(
        new UnauthorizedException('Usuario no encontrado'),
      );

      expect(bcryptCompareMock).not.toHaveBeenCalled();
      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(userMock);
      bcryptCompareMock.mockResolvedValue(false);

      await expect(service.login(loginData)).rejects.toThrow(
        new UnauthorizedException('Contraseña incorrecta'),
      );

      expect(jwtServiceMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debe revocar el token guardando su jti en la denylist', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: usuarioId,
        id: usuarioId,
        correo: 'ana@test.com',
        role: 'alumno',
        jti: 'jti-falso',
        exp: 2000000000,
      });

      const result = await service.logout('jwt-token-falso');

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('jwt-token-falso');
      expect(prismaMock.tokenRevocado.upsert).toHaveBeenCalledWith({
        where: { jti: 'jti-falso' },
        update: {},
        create: {
          jti: 'jti-falso',
          usuarioId,
          expiraEn: new Date(2000000000 * 1000),
        },
      });
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });

    it('debe ser idempotente y no revocar dos veces si el jti ya existe', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: usuarioId,
        id: usuarioId,
        correo: 'ana@test.com',
        role: 'alumno',
        jti: 'jti-falso',
      });
      prismaMock.tokenRevocado.upsert.mockResolvedValue({});

      const result = await service.logout('jwt-token-falso');

      expect(prismaMock.tokenRevocado.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });

    it('debe no hacer nada si el token no tiene jti (legacy)', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: usuarioId,
        id: usuarioId,
        correo: 'ana@test.com',
        role: 'alumno',
      });

      const result = await service.logout('jwt-viejo');

      expect(prismaMock.tokenRevocado.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });

    it('debe lanzar UnauthorizedException si el token es inválido o expirado', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.logout('token-roto')).rejects.toThrow(
        new UnauthorizedException('Token inválido o expirado'),
      );

      expect(prismaMock.tokenRevocado.upsert).not.toHaveBeenCalled();
    });
  });

  describe('registerEntrenador', () => {
    const registerEntrenadorData = {
      nombre: 'Carlos',
      apellido_paterno: 'Pérez',
      apellido_materno: 'López',
      correo: 'carlos@test.com',
      password: 'password-secreta',
      fecha_nacimiento: '1990-05-10',
      sexo: 'MASCULINO' as const,
      nombre_publico: 'Carlos Fitness',
      fecha_entrenador: '2024-01-15',
    };

    it('debe registrar entrenador, hashear password y crear slug', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      transactionMock.usuario.create.mockResolvedValue({
        id: usuarioId,
      });

      const result = await service.registerEntrenador(registerEntrenadorData);

      expect(bcryptHashMock).toHaveBeenCalledWith(registerEntrenadorData.password, 10);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(transactionMock.usuario.create).toHaveBeenCalledWith({
        data: {
          nombre: registerEntrenadorData.nombre,
          apellidoPaterno: registerEntrenadorData.apellido_paterno,
          apellidoMaterno: registerEntrenadorData.apellido_materno,
          correo: registerEntrenadorData.correo,
          hashedPassword: 'hash-falso',
          fechaNacimiento: new Date(registerEntrenadorData.fecha_nacimiento),
          role: UserRole.entrenador,
          idSexo: DB_SEXO_IDS.MASCULINO,
        },
      });

      expect(transactionMock.entrenador.create).toHaveBeenCalledWith({
        data: {
          idUsuario: usuarioId,
          idPlan: 1,
          slug: 'carlos-fitness',
          fechaEntrenador: new Date(registerEntrenadorData.fecha_entrenador),
          nombrePublico: registerEntrenadorData.nombre_publico,
        },
      });

      expect(prismaMock.planEntrenador.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, estaActivo: true },
      });

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
      });
    });

    it('debe validar el plan elegido y devolver datos de pago cuando requiere pago', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      transactionMock.usuario.create.mockResolvedValue({
        id: usuarioId,
      });

      prismaMock.planEntrenador.findUnique.mockResolvedValue({ id: 3, estaActivo: true });

      suscripcionesServiceMock.activarSuscripcionInicial.mockResolvedValue({
        suscripcion: { id: 7n },
        pagoId: 42n,
        creada: true,
      });

      const result = await service.registerEntrenador({
        ...registerEntrenadorData,
        id_plan: 3,
      });

      expect(prismaMock.planEntrenador.findUnique).toHaveBeenCalledWith({
        where: { id: 3 },
        select: { id: true, estaActivo: true },
      });

      expect(transactionMock.entrenador.create).toHaveBeenCalledWith({
        data: {
          idUsuario: usuarioId,
          idPlan: 3,
          slug: 'carlos-fitness',
          fechaEntrenador: new Date(registerEntrenadorData.fecha_entrenador),
          nombrePublico: registerEntrenadorData.nombre_publico,
        },
      });

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
        requierePago: true,
        pagoId: '42',
        suscripcionId: '7',
      });
    });

    it('debe rechazar el registro si el plan de entrenador es inexistente o inactivo', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      prismaMock.planEntrenador.findUnique.mockResolvedValue(null);

      await expect(
        service.registerEntrenador({ ...registerEntrenadorData, id_plan: 99 }),
      ).rejects.toThrow('El plan de entrenador 99 no existe');

      expect(transactionMock.usuario.create).not.toHaveBeenCalled();
    });

    it('debe asignar sexo FEMENINO al registrar entrenadora', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      transactionMock.usuario.create.mockResolvedValue({
        id: usuarioId,
      });

      const entrenadoraData = {
        ...registerEntrenadorData,
        sexo: 'FEMENINO' as const,
      };

      await service.registerEntrenador(entrenadoraData);

      expect(transactionMock.usuario.create).toHaveBeenCalledWith({
        data: {
          nombre: entrenadoraData.nombre,
          apellidoPaterno: entrenadoraData.apellido_paterno,
          apellidoMaterno: entrenadoraData.apellido_materno,
          correo: entrenadoraData.correo,
          hashedPassword: 'hash-falso',
          fechaNacimiento: new Date(entrenadoraData.fecha_nacimiento),
          role: UserRole.entrenador,
          idSexo: DB_SEXO_IDS.FEMENINO,
        },
      });
    });
  });

  describe('registerAlumno', () => {
    const registerAlumnoData = {
      nombre: 'Ana',
      apellido_paterno: 'Martínez',
      apellido_materno: 'García',
      correo: 'ana@test.com',
      password: 'password-secreta',
      fecha_nacimiento: '2000-04-20',
      sexo: 'FEMENINO' as const,
      numero_celular: '5551234567',
      fecha_inicio_entrenamiento: '2026-08-20',
      id_objetivo: 1,
      id_nivel_actividad: 3,
      observaciones_medicas: 'Ninguna',
      lesiones_actuales: 'Ninguna',
      lesiones_pasadas: 'Ninguna',
      contacto_emergencia_nombre: 'María Martínez',
      contacto_emergencia_telefono: '5557654321',
    };

    it('debe registrar alumno sin entrenador con role alumno', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      transactionMock.usuario.create.mockResolvedValue({
        id: usuarioId,
      });

      const result = await service.registerAlumno(registerAlumnoData);

      expect(bcryptHashMock).toHaveBeenCalledWith(registerAlumnoData.password, 10);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(transactionMock.usuario.create).toHaveBeenCalledWith({
        data: {
          nombre: registerAlumnoData.nombre,
          role: UserRole.alumno,
          apellidoPaterno: registerAlumnoData.apellido_paterno,
          apellidoMaterno: registerAlumnoData.apellido_materno,
          correo: registerAlumnoData.correo,
          hashedPassword: 'hash-falso',
          fechaNacimiento: new Date(registerAlumnoData.fecha_nacimiento),
          idSexo: DB_SEXO_IDS.FEMENINO,
        },
      });

      expect(transactionMock.alumno.create).toHaveBeenCalledWith({
        data: {
          idUsuario: usuarioId,
          idPlan: 1,
          numeroCelular: '5551234567',
          fechaInicioEntrenamiento: new Date(registerAlumnoData.fecha_inicio_entrenamiento),
          idObjetivo: registerAlumnoData.id_objetivo,
          idNivelActividad: registerAlumnoData.id_nivel_actividad,
          observacionesMedicas: registerAlumnoData.observaciones_medicas,
          lesionesActuales: registerAlumnoData.lesiones_actuales,
          lesionesPasadas: registerAlumnoData.lesiones_pasadas,
          contactoEmergenciaNombre: registerAlumnoData.contacto_emergencia_nombre,
          contactoEmergenciaTelefono: registerAlumnoData.contacto_emergencia_telefono,
        },
      });

      expect(prismaMock.planAlumno.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, estaActivo: true },
      });

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
      });
    });

    it('debe validar el plan elegido y devolver datos de pago cuando requiere pago', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      transactionMock.usuario.create.mockResolvedValue({
        id: usuarioId,
      });

      prismaMock.planAlumno.findUnique.mockResolvedValue({ id: 2, estaActivo: true });

      suscripcionesServiceMock.activarSuscripcionInicial.mockResolvedValue({
        suscripcion: { id: 5n },
        pagoId: 9n,
        creada: true,
      });

      const result = await service.registerAlumno({
        ...registerAlumnoData,
        id_plan: 2,
      });

      expect(prismaMock.planAlumno.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        select: { id: true, estaActivo: true },
      });

      expect(transactionMock.alumno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idPlan: 2,
          }),
        }),
      );

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
        requierePago: true,
        pagoId: '9',
        suscripcionId: '5',
      });
    });

    it('debe rechazar el registro si el plan de alumno es inexistente', async () => {
      bcryptHashMock.mockResolvedValue('hash-falso');

      prismaMock.planAlumno.findUnique.mockResolvedValue(null);

      await expect(
        service.registerAlumno({ ...registerAlumnoData, id_plan: 99 }),
      ).rejects.toThrow('El plan de alumno 99 no existe');

      expect(transactionMock.usuario.create).not.toHaveBeenCalled();
    });
  });
});
