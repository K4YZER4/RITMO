import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Dumbbell, Trophy, Weight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get } from '../lib/api';
import type { ExerciseLibrary } from '../lib/types';
import { WeeklyRoutinePlanner } from '../components/WeeklyRoutinePlanner';
import type { Routine } from '../lib/types';
import { SessionDetailModal } from '../components/SessionDetailModal';

type StudentDetailData = {
  idUsuario: string;
  observacionesMedicas?: string;
  lesionesActuales?: string;
  lesionesPasadas?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  numeroCelular?: string;
  usuario: {
    nombre: string;
    apellidoPaterno: string;
    correo: string;
    usuarioMedicion: Array<{
      id: string;
      fechaMedicion: string;
      pesoKg?: string;
      grasaCorporalPct?: string;
    }>;
    usuarioRutina: Array<{
      id: string;
      idDiaSemana: number;
      fechaInicio: string;
      fechaFin?: string | null;
      rutina: Routine;
      diaSemana: { nombre: string };
    }>;
    sesionEntrenamiento: Array<{
      id: string;
      fechaSesion: string;
      idEstado: number;
      rutina: { nombre: string };
    }>;
    alumnoEjercicioPr: Array<{
      id: string;
      peso: string;
      repeticiones: number;
      ejercicioEstandar?: { nombre: string };
      ejercicioPersonalizado?: { nombre: string };
    }>;
  };
  objetivo?: { nombre: string };
};

export function StudentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  useEffect(() => {
    void qc.prefetchQuery({
      queryKey: ['exercises'],
      queryFn: () => get<ExerciseLibrary>('/ejercicios'),
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => get<StudentDetailData>(`/entrenador/alumnos/${id}`),
    enabled: Boolean(id),
  });
  const progress = useQuery({
    queryKey: ['student-progress', id],
    queryFn: () =>
      get<{ sesionesUltimos30Dias: number; volumenUltimos30Dias: number }>(
        `/entrenador/alumnos/${id}/progreso`,
      ),
    enabled: Boolean(id),
  });
  const routines = useQuery({
    queryKey: ['routines'],
    queryFn: () => get<Routine[]>('/rutinas'),
  });
  if (isLoading) return <Loading />;
  if (isError || !data) return <Empty>No se pudo cargar el detalle del alumno.</Empty>;
  const latest = data.usuario.usuarioMedicion[0];
  return (
    <Page
      eyebrow="SEGUIMIENTO"
      title={fullName(data.usuario)}
      action={
        <Link className="button ghost" to="/app/alumnos">
          <ArrowLeft /> Volver
        </Link>
      }
    >
      <p>
        {data.usuario.correo} · Objetivo: {data.objetivo?.nombre || 'No definido'}
        {data.numeroCelular && ` · 📱 ${data.numeroCelular}`}
      </p>

      {/* Ficha médica y restricciones de lesiones para el entrenador */}
      <Card style={{ marginBottom: '16px', background: 'var(--card-subtle, rgba(255,255,255,0.02))' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '1rem', color: 'var(--accent, #e5a93b)' }}>
          📋 Ficha Médica y Restricciones Físicas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--danger, #ff6b6b)' }}>LESIONES ACTUALES</span>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
              {data.lesionesActuales || 'Ninguna molestia activa reportada.'}
            </p>
          </div>
          <div>
            <span className="eyebrow">LESIONES PASADAS</span>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
              {data.lesionesPasadas || 'Sin historial de lesiones previas.'}
            </p>
          </div>
          <div>
            <span className="eyebrow">OBSERVACIONES MÉDICAS</span>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
              {data.observacionesMedicas || 'Apto para entrenamiento sin restricciones.'}
            </p>
          </div>
          {data.contactoEmergenciaNombre && (
            <div>
              <span className="eyebrow">CONTACTO DE EMERGENCIA</span>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
                {data.contactoEmergenciaNombre} ({data.contactoEmergenciaTelefono || 'Sin teléfono'})
              </p>
            </div>
          )}
        </div>
      </Card>
      {progress.isError && (
        <div className="error">No se pudo cargar el resumen de progreso de este alumno.</div>
      )}
      <div className="stats">
        <Card>
          <Weight />
          <b>{latest?.pesoKg || '—'} kg</b>
          <span>última medición</span>
        </Card>
        <Card>
          <CalendarDays />
          <b>{progress.data?.sesionesUltimos30Dias ?? data.usuario.sesionEntrenamiento.length}</b>
          <span>sesiones en 30 días</span>
        </Card>
        <Card>
          <Trophy />
          <b>{Math.round(progress.data?.volumenUltimos30Dias ?? 0).toLocaleString()} kg</b>
          <span>volumen en 30 días</span>
        </Card>
      </div>
      {/* Planificador semanal a ancho completo */}
      <WeeklyRoutinePlanner
        studentId={id || ''}
        assignments={data.usuario.usuarioRutina}
        routines={routines.data || []}
      />

      {/* Grid balanceado de Récords y Sesiones recientes */}
      <div className="split" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: '20px' }}>
        <Card>
          <div className="card-head">
            <h2>Récords personales</h2>
            <Trophy className="accent-icon" />
          </div>
          {data.usuario.alumnoEjercicioPr.map((pr) => (
            <div className="list-row" key={pr.id}>
              <div className="session-icon" style={{ background: '#293521' }}>
                <Trophy size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <b>{pr.ejercicioEstandar?.nombre || pr.ejercicioPersonalizado?.nombre}</b>
                <small>{pr.repeticiones} repeticiones máximas</small>
              </div>
              <strong>{pr.peso} kg</strong>
            </div>
          ))}
          {!data.usuario.alumnoEjercicioPr.length && <Empty>Sin récords todavía.</Empty>}
        </Card>

        <Card>
          <div className="card-head">
            <h2>Sesiones recientes</h2>
            <Dumbbell className="accent-icon" />
          </div>
          {data.usuario.sesionEntrenamiento.map((session) => (
            <div
              className="list-row"
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              style={{ cursor: 'pointer', transition: 'background 150ms' }}
              title="Haz clic para ver el detalle de la sesión"
            >
              <div className="session-icon">
                <Dumbbell size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                <b>{session.rutina.nombre}</b>
                <small>
                  {new Date(session.fechaSesion).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {' · '}
                  <span style={{ color: 'var(--g, #b4ff39)' }}>Ver detalle ↗</span>
                </small>
              </div>
              <span className={`pill small ${session.idEstado === 2 ? 'success' : ''}`}>
                {session.idEstado === 2 ? 'Completada' : 'En curso'}
              </span>
            </div>
          ))}
          {!data.usuario.sesionEntrenamiento.length && (
            <Empty>El alumno todavía no tiene sesiones.</Empty>
          )}
        </Card>
      </div>

      {selectedSessionId && (
        <SessionDetailModal
          sesionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}
    </Page>
  );
}
