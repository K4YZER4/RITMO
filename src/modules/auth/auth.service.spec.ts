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
    $transaction: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  const suscripcionesServiceMock = {
    activarSuscripcionInicial: jest.fn(),
  };

  const bcryptCompareMock = bcrypt.compare as jest.MockedFunction<BcryptCompareAsync>;

  const bcryptHashMock = bcrypt.hash as jest.MockedFunction<BcryptHashAsync>;

  beforeEach(async () => {
    jest.clearAllMocks();

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
          slug: 'carlos-fitness',
          fechaEntrenador: new Date(registerEntrenadorData.fecha_entrenador),
          nombrePublico: registerEntrenadorData.nombre_publico,
        },
      });

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
      });
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
      numero_celular: 5551234567,
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

      expect(result).toEqual({
        message: 'Usuario registrado exitosamente',
      });
    });
  });
});
