import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ActualizarSetDto } from './dto/actualizar-set.dto';
import { FinalizarSesionDto } from './dto/finalizar-sesion.dto';
import { RegistrarMedicionDto } from './dto/registrar-medicion.dto';
import { ReprogramarRutinaDto } from './dto/reprogramar-rutina.dto';
import { ReordenarSemanaDto } from './dto/reordenar-semana.dto';

const ESTADO_ACTIVO_ID = 1;
const ESTADO_COMPLETADO_ID = 2;

@Injectable()
export class EntrenamientoService {
  constructor(private readonly prisma: PrismaService) {}

  obtenerEntrenamientoHoy(usuarioId: string, zonaHoraria = 'UTC') {
    const hoy = this.inicioDelDiaEnZona(new Date(), zonaHoraria);
    const manana = new Date(hoy);
    manana.setUTCDate(manana.getUTCDate() + 1);
    const diaSemana = this.obtenerDiaSemana(hoy);

    return this.prisma.usuarioRutina.findMany({
      where: {
        idUsuario: usuarioId,
        activa: true,
        idDiaSemana: diaSemana,
        fechaInicio: { lt: manana },
        OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        diaSemana: true,
        rutina: {
          include: {
            categoriaRutina: true,
            rutinaEjercicio: {
              orderBy: { orden: 'asc' },
              include: { ejercicioEstandar: true, ejercicioPersonalizado: true },
            },
          },
        },
        override: true,
        sesionEntrenamiento: {
          where: { fechaSesion: { gte: hoy, lt: manana } },
          select: { id: true, idEstado: true, fechaSesion: true },
        },
      },
    });
  }

  obtenerSemana(usuarioId: string, zonaHoraria = 'UTC') {
    const hoy = this.inicioDelDiaEnZona(new Date(), zonaHoraria);
    const diaActual = this.obtenerDiaSemana(hoy);
    const lunes = new Date(hoy);
    lunes.setUTCDate(lunes.getUTCDate() - diaActual + 1);
    const siguienteLunes = new Date(lunes);
    siguienteLunes.setUTCDate(siguienteLunes.getUTCDate() + 7);

    return Promise.all([
      this.prisma.usuarioRutina.findMany({
        where: {
          idUsuario: usuarioId,
          activa: true,
          fechaInicio: { lte: hoy },
          OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }],
        },
        orderBy: { idDiaSemana: 'asc' },
        include: {
          diaSemana: true,
          rutina: {
            select: { id: true, nombre: true, descripcion: true, categoriaRutina: true },
          },
        },
      }),
      this.prisma.sesionEntrenamiento.findMany({
        where: {
          idUsuario: usuarioId,
          fechaSesion: { gte: lunes, lt: siguienteLunes },
        },
        select: { idUsuarioRutina: true, idEstado: true, fechaSesion: true },
      }),
    ]).then(([asignaciones, sesiones]) => {
      const semanaActual = this.fechaClaveEnZona(lunes, zonaHoraria);
      return asignaciones
        .filter(
          (asignacion) => asignacion.motivoCambio !== `Reprogramada origen semana ${semanaActual}`,
        )
        .map((asignacion) => {
          const fechaProgramada = new Date(lunes);
          fechaProgramada.setUTCDate(fechaProgramada.getUTCDate() + asignacion.idDiaSemana - 1);
          const fechaClave = this.fechaClaveEnZona(fechaProgramada, zonaHoraria);
          const sesionesDelDia = sesiones.filter(
            (sesion) =>
              sesion.idUsuarioRutina === asignacion.id &&
              this.fechaClaveEnZona(sesion.fechaSesion, zonaHoraria) === fechaClave,
          );
          const completada = sesionesDelDia.some(
            (sesion) => sesion.idEstado === ESTADO_COMPLETADO_ID,
          );
          const enCurso = sesionesDelDia.some((sesion) => sesion.idEstado === ESTADO_ACTIVO_ID);
          const reprogramada =
            fechaProgramada < hoy &&
            asignacion.motivoCambio === `Reprogramada semana ${semanaActual}`;
          let estadoSemana = 'disponible';
          if (reprogramada) estadoSemana = 'reprogramada';
          else if (completada) estadoSemana = 'completada';
          else if (enCurso) estadoSemana = 'en_curso';
          else if (fechaProgramada < hoy) estadoSemana = 'pendiente';
          return {
            ...asignacion,
            fechaProgramada: fechaClave,
            estadoSemana,
          };
        });
    });
  }

  async reprogramarRutinaPendiente(
    usuarioId: string,
    dto: ReprogramarRutinaDto,
    zonaHoraria = 'UTC',
  ) {
    const hoy = this.inicioDelDiaEnZona(new Date(), zonaHoraria);
    const diaActual = this.obtenerDiaSemana(hoy);
    const lunes = new Date(hoy);
    lunes.setUTCDate(lunes.getUTCDate() - diaActual + 1);
    const domingo = new Date(lunes);
    domingo.setUTCDate(domingo.getUTCDate() + 6);
    const asignacionId = BigInt(dto.id_usuario_rutina);
    const asignacion = await this.prisma.usuarioRutina.findFirst({
      where: { id: asignacionId, idUsuario: usuarioId, activa: true },
      include: { rutina: true },
    });
    if (!asignacion) throw new NotFoundException('Rutina pendiente no encontrada');
    if (asignacion.idDiaSemana >= diaActual) {
      throw new BadRequestException('Solo puedes reprogramar rutinas de días anteriores');
    }
    const conflicto = await this.prisma.usuarioRutina.findFirst({
      where: {
        idUsuario: usuarioId,
        activa: true,
        idDiaSemana: dto.numero_dia,
        id: { not: asignacionId },
        fechaInicio: { lte: domingo },
        OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }],
      },
    });
    if (conflicto) throw new BadRequestException('Ese día ya tiene una rutina asignada');
    const semana = this.fechaClaveEnZona(lunes, zonaHoraria);
    return this.prisma.$transaction(async (tx) => {
      await tx.usuarioRutina.update({
        where: { id: asignacionId },
        data: { motivoCambio: `Reprogramada origen semana ${semana}` },
      });
      await tx.usuarioRutina.create({
        data: {
          idUsuario: usuarioId,
          idRutina: asignacion.idRutina,
          idDiaSemana: dto.numero_dia,
          fechaInicio: hoy,
          fechaFin: domingo,
          asignadaPorUsuario: usuarioId,
          createdBy: usuarioId,
          updatedBy: usuarioId,
          motivoCambio: `Reprogramada semana ${semana}`,
        },
      });
      return { success: true, message: 'Rutina reprogramada para esta semana' };
    });
  }

  async reordenarSemana(usuarioId: string, dto: ReordenarSemanaDto, zonaHoraria = 'UTC') {
    const hoy = this.inicioDelDiaEnZona(new Date(), zonaHoraria);
    const diaActual = this.obtenerDiaSemana(hoy);
    const lunes = new Date(hoy);
    lunes.setUTCDate(lunes.getUTCDate() - diaActual + 1);
    const domingo = new Date(lunes);
    domingo.setUTCDate(domingo.getUTCDate() + 6);
    const semana = this.fechaClaveEnZona(lunes, zonaHoraria);
    const asignaciones = await this.prisma.usuarioRutina.findMany({
      where: {
        idUsuario: usuarioId,
        activa: true,
        fechaInicio: { lte: domingo },
        OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }],
      },
    });
    const ids = new Set(asignaciones.map((item) => item.id.toString()));
    const destinos = new Set<number>();
    for (const dia of dto.dias) {
      if (!ids.has(dia.id_usuario_rutina)) {
        throw new BadRequestException('Rutina no disponible');
      }
      if (destinos.has(dia.numero_dia)) {
        throw new BadRequestException('No puedes ocupar dos veces el mismo día');
      }
      destinos.add(dia.numero_dia);
    }
    const cambios = dto.dias.filter((dia) => {
      const actual = asignaciones.find((item) => item.id.toString() === dia.id_usuario_rutina);
      return actual && actual.idDiaSemana !== dia.numero_dia;
    });
    await this.prisma.$transaction(async (tx) => {
      for (const cambio of cambios) {
        const actual = asignaciones.find(
          (item) => item.id.toString() === cambio.id_usuario_rutina,
        )!;
        await tx.usuarioRutina.update({
          where: { id: actual.id },
          data: { motivoCambio: `Reprogramada origen semana ${semana}` },
        });
        await tx.usuarioRutina.create({
          data: {
            idUsuario: usuarioId,
            idRutina: actual.idRutina,
            idDiaSemana: cambio.numero_dia,
            fechaInicio: hoy,
            fechaFin: domingo,
            asignadaPorUsuario: usuarioId,
            createdBy: usuarioId,
            updatedBy: usuarioId,
            motivoCambio: `Reprogramada semana ${semana}`,
          },
        });
      }
    });
    return { success: true, message: 'Semana reordenada correctamente' };
  }

  async iniciarSesion(usuarioId: string, usuarioRutinaId: bigint) {
    const ahora = new Date();
    const hoy = this.inicioDelDia(ahora);
    const manana = new Date(hoy);
    manana.setUTCDate(manana.getUTCDate() + 1);

    const asignacion = await this.prisma.usuarioRutina.findFirst({
      where: {
        id: usuarioRutinaId,
        idUsuario: usuarioId,
        activa: true,
        fechaInicio: { lt: manana },
        OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }],
      },
      include: {
        rutina: { include: { rutinaEjercicio: { orderBy: { orden: 'asc' } } } },
        override: true,
      },
    });

    if (!asignacion) {
      throw new NotFoundException('Asignación de rutina activa no encontrada');
    }

    const sesionExistente = await this.prisma.sesionEntrenamiento.findFirst({
      where: {
        idUsuario: usuarioId,
        idUsuarioRutina: usuarioRutinaId,
        idEstado: ESTADO_ACTIVO_ID,
        fechaSesion: { gte: hoy, lt: manana },
      },
      select: { id: true },
    });

    if (sesionExistente) {
      return this.obtenerSesion(usuarioId, sesionExistente.id);
    }

    const overrides = new Map(
      asignacion.override.map((item) => [item.idRutinaEjercicio.toString(), item]),
    );

    const sesion = await this.prisma.sesionEntrenamiento.create({
      data: {
        idUsuario: usuarioId,
        idUsuarioRutina: asignacion.id,
        idRutina: asignacion.idRutina,
        fechaSesion: ahora,
        idEstado: ESTADO_ACTIVO_ID,
        createdBy: usuarioId,
        sesionEjercicio: {
          create: asignacion.rutina.rutinaEjercicio.map((ejercicio) => {
            const override = overrides.get(ejercicio.id.toString());
            const series = override?.series ?? ejercicio.series;
            const repeticiones = override?.repeticiones ?? ejercicio.repeticiones;
            const peso = override?.pesoObjetivo ?? ejercicio.pesoObjetivo;

            return {
              idRutinaEjercicio: ejercicio.id,
              idEjercicioEstandar: ejercicio.idEjercicioEstandar,
              idEjercicioPersonalizado: ejercicio.idEjercicioPersonalizado,
              orden: ejercicio.orden,
              nota: override?.notaEntrenador ?? ejercicio.notaEntrenador,
              sesionEjercicioSet: {
                create: Array.from({ length: series }, (_, index) => ({
                  numeroSet: index + 1,
                  repeticionesObjetivo: repeticiones,
                  pesoObjetivo: peso,
                })),
              },
            };
          }),
        },
      },
      select: { id: true },
    });

    return this.obtenerSesion(usuarioId, sesion.id);
  }

  async obtenerSesion(usuarioId: string, sesionId: bigint) {
    const sesion = await this.prisma.sesionEntrenamiento.findUnique({
      where: { id: sesionId },
      include: {
        estado: true,
        rutina: { select: { id: true, nombre: true, descripcion: true } },
        usuario: { select: { alumno: { select: { idEntrenadorActual: true } } } },
        sesionEjercicio: {
          orderBy: { orden: 'asc' },
          include: {
            ejercicioEstandar: true,
            ejercicioPersonalizado: true,
            sesionEjercicioSet: { orderBy: { numeroSet: 'asc' } },
          },
        },
      },
    });

    if (!sesion) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const esPropietario = sesion.idUsuario === usuarioId;
    const esEntrenador = sesion.usuario.alumno?.idEntrenadorActual === usuarioId;
    if (!esPropietario && !esEntrenador) {
      throw new ForbiddenException('No tienes acceso a esta sesión');
    }

    return sesion;
  }

  obtenerHistorial(usuarioId: string) {
    return this.prisma.sesionEntrenamiento.findMany({
      where: { idUsuario: usuarioId },
      orderBy: { fechaSesion: 'desc' },
      take: 50,
      include: {
        estado: true,
        rutina: { select: { id: true, nombre: true } },
        _count: { select: { sesionEjercicio: true } },
      },
    });
  }

  async actualizarSet(usuarioId: string, sesionId: bigint, setId: bigint, dto: ActualizarSetDto) {
    const set = await this.prisma.sesionEjercicioSet.findFirst({
      where: {
        id: setId,
        sesionEjercicio: {
          idSesionEntrenamiento: sesionId,
          sesionEntrenamiento: { idUsuario: usuarioId, idEstado: ESTADO_ACTIVO_ID },
        },
      },
      include: {
        sesionEjercicio: {
          select: { idEjercicioEstandar: true, idEjercicioPersonalizado: true },
        },
      },
    });

    if (!set) {
      throw new NotFoundException('Set editable no encontrado');
    }

    const actualizado = await this.prisma.sesionEjercicioSet.update({
      where: { id: setId },
      data: {
        repeticionesRealizadas: dto.repeticiones,
        pesoReal: dto.peso,
        rir: dto.rir,
        rpe: dto.rpe,
        descansoSegundos: dto.descanso_segundos,
        completado: dto.completado,
      },
    });

    let nuevoPr = false;
    if (actualizado.completado && actualizado.pesoReal && actualizado.repeticionesRealizadas) {
      const ejercicio = set.sesionEjercicio;
      const prAnterior = await this.prisma.alumnoEjercicioPr.findFirst({
        where: {
          idUsuario: usuarioId,
          idEjercicioEstandar: ejercicio.idEjercicioEstandar,
          idEjercicioPersonalizado: ejercicio.idEjercicioPersonalizado,
        },
        orderBy: { peso: 'desc' },
        select: { peso: true },
      });

      if (!prAnterior || Number(actualizado.pesoReal) > Number(prAnterior.peso)) {
        await this.prisma.alumnoEjercicioPr.create({
          data: {
            idUsuario: usuarioId,
            idEjercicioEstandar: ejercicio.idEjercicioEstandar,
            idEjercicioPersonalizado: ejercicio.idEjercicioPersonalizado,
            peso: actualizado.pesoReal,
            repeticiones: actualizado.repeticionesRealizadas,
            idSesionEjercicioSet: actualizado.id,
            fechaPr: new Date(),
          },
        });
        nuevoPr = true;
      }
    }

    return { set: actualizado, nuevoPr };
  }

  async finalizarSesion(usuarioId: string, sesionId: bigint, dto: FinalizarSesionDto) {
    const sesion = await this.prisma.sesionEntrenamiento.findFirst({
      where: { id: sesionId, idUsuario: usuarioId, idEstado: ESTADO_ACTIVO_ID },
      select: { id: true },
    });
    if (!sesion) {
      throw new NotFoundException('Sesión activa no encontrada');
    }

    const [totalSets, setsCompletados] = await Promise.all([
      this.prisma.sesionEjercicioSet.count({
        where: { sesionEjercicio: { idSesionEntrenamiento: sesionId } },
      }),
      this.prisma.sesionEjercicioSet.count({
        where: { sesionEjercicio: { idSesionEntrenamiento: sesionId }, completado: true },
      }),
    ]);

    if (totalSets > 0 && setsCompletados === 0) {
      throw new BadRequestException('Completa al menos un set antes de finalizar');
    }

    const actualizada = await this.prisma.sesionEntrenamiento.update({
      where: { id: sesionId },
      data: {
        idEstado: ESTADO_COMPLETADO_ID,
        duracionMinutos: dto.duracion_minutos,
        notasAlumno: dto.notas,
        updatedBy: usuarioId,
      },
    });

    return { sesion: actualizada, totalSets, setsCompletados };
  }

  listarMediciones(usuarioId: string) {
    return this.prisma.usuarioMedicion.findMany({
      where: { idUsuario: usuarioId },
      orderBy: { fechaMedicion: 'desc' },
      take: 100,
    });
  }

  registrarMedicion(usuarioId: string, dto: RegistrarMedicionDto) {
    const fechaMedicion = new Date(`${dto.fecha_medicion}T00:00:00.000Z`);

    return this.prisma.usuarioMedicion.upsert({
      where: { idUsuario_fechaMedicion: { idUsuario: usuarioId, fechaMedicion } },
      update: this.mapearMedicion(dto),
      create: { idUsuario: usuarioId, fechaMedicion, ...this.mapearMedicion(dto) },
    });
  }

  async obtenerResumenProgreso(usuarioId: string) {
    const desde = new Date();
    desde.setUTCDate(desde.getUTCDate() - 30);

    const [sesiones, prs, ultimaMedicion] = await Promise.all([
      this.prisma.sesionEntrenamiento.findMany({
        where: {
          idUsuario: usuarioId,
          idEstado: ESTADO_COMPLETADO_ID,
          fechaSesion: { gte: desde },
        },
        include: {
          sesionEjercicio: {
            include: { sesionEjercicioSet: { where: { completado: true } } },
          },
        },
      }),
      this.prisma.alumnoEjercicioPr.findMany({
        where: { idUsuario: usuarioId },
        orderBy: { fechaPr: 'desc' },
        take: 10,
        include: { ejercicioEstandar: true, ejercicioPersonalizado: true },
      }),
      this.prisma.usuarioMedicion.findFirst({
        where: { idUsuario: usuarioId },
        orderBy: { fechaMedicion: 'desc' },
      }),
    ]);

    const volumen = sesiones.reduce(
      (total, sesion) =>
        total +
        sesion.sesionEjercicio.reduce(
          (subtotal, ejercicio) =>
            subtotal +
            ejercicio.sesionEjercicioSet.reduce(
              (suma, set) =>
                suma + Number(set.pesoReal ?? 0) * Number(set.repeticionesRealizadas ?? 0),
              0,
            ),
          0,
        ),
      0,
    );

    return {
      sesionesUltimos30Dias: sesiones.length,
      volumenUltimos30Dias: volumen,
      prs,
      ultimaMedicion,
    };
  }

  private mapearMedicion(dto: RegistrarMedicionDto) {
    return {
      pesoKg: dto.peso_kg,
      estaturaCm: dto.estatura_cm,
      grasaCorporalPct: dto.grasa_corporal_pct,
      cinturaCm: dto.cintura_cm,
      caderaCm: dto.cadera_cm,
      pechoCm: dto.pecho_cm,
      brazoCm: dto.brazo_cm,
      piernaCm: dto.pierna_cm,
      nota: dto.nota,
    };
  }

  private inicioDelDia(fecha: Date): Date {
    return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  }

  private inicioDelDiaEnZona(fecha: Date, zonaHoraria: string): Date {
    let partes: Intl.DateTimeFormatPart[];
    try {
      partes = new Intl.DateTimeFormat('en-US', {
        timeZone: zonaHoraria,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(fecha);
    } catch {
      partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(fecha);
    }
    const valor = (tipo: string) => Number(partes.find((parte) => parte.type === tipo)?.value);
    return new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day')));
  }

  private fechaClaveEnZona(fecha: Date, zonaHoraria: string): string {
    const dia = this.inicioDelDiaEnZona(fecha, zonaHoraria);
    return dia.toISOString().slice(0, 10);
  }

  private obtenerDiaSemana(fecha: Date): number {
    return fecha.getUTCDay() === 0 ? 7 : fecha.getUTCDay();
  }
}
