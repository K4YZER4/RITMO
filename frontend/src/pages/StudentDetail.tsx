import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  MessageSquare,
  Trophy,
  Weight,
  X,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get } from '../lib/api';
import type { ExerciseLibrary } from '../lib/types';
import { WeeklyRoutinePlanner } from '../components/WeeklyRoutinePlanner';
import type { Routine } from '../lib/types';

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

type SessionDetailResponse = {
  id: string;
  fechaSesion: string;
  duracionMinutos?: number | null;
  notasAlumno?: string | null;
  notasEntrenador?: string | null;
  idEstado: number;
  estado: { id: number; nombre: string };
  rutina: { id: string; nombre: string; descripcion?: string | null };
  sesionEjercicio: Array<{
    id: string;
    orden: number;
    nota?: string | null;
    ejercicioEstandar?: { id: string; nombre: string; grupoMuscular?: string | null };
    ejercicioPersonalizado?: { id: string; nombre: string; grupoMuscular?: string | null };
    sesionEjercicioSet: Array<{
      id: string;
      numeroSet: number;
      repeticionesObjetivo?: number | null;
      pesoObjetivo?: string | number | null;
      repeticionesRealizadas?: number | null;
      pesoReal?: string | number | null;
      rpe?: string | number | null;
      rir?: string | number | null;
      completado: boolean;
    }>;
  }>;
};

function SessionDetailModal({ sesionId, onClose }: { sesionId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['session', sesionId],
    queryFn: () => get<SessionDetailResponse>(`/sesiones/${sesionId}`),
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>

        {isLoading && <Loading />}
        {isError && <Empty>No se pudo cargar el detalle de la sesión.</Empty>}

        {data && (
          <div>
            <span className="eyebrow">REGISTRO DE ENTRENAMIENTO</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', margin: '4px 0 10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{data.rutina.nombre}</h2>
              <span className={`pill small ${data.idEstado === 2 ? 'success' : ''}`}>
                {data.idEstado === 2 ? 'Completada' : 'En curso'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--muted, #9ca3af)', fontSize: '0.85rem', marginBottom: '18px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarDays size={14} />
                {new Date(data.fechaSesion).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--g, #b4ff39)', fontWeight: 600 }}>
                <Clock size={14} />
                {data.duracionMinutos ? `${data.duracionMinutos} minutos` : '50 minutos'}
              </span>
            </div>

            {/* Comentarios del Alumno */}
            {data.notasAlumno && (
              <div
                style={{
                  background: 'rgba(180, 255, 57, 0.05)',
                  border: '1px solid rgba(180, 255, 57, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--g, #b4ff39)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                  <MessageSquare size={16} /> Sensaciones y feedback del alumno al finalizar:
                </div>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#e5e7eb', fontSize: '0.92rem', lineHeight: '1.45' }}>
                  "{data.notasAlumno}"
                </p>
              </div>
            )}

            {/* Comentarios del Entrenador */}
            {data.notasEntrenador && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent, #e5a93b)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
                  📋 Instrucción / Respuesta del entrenador:
                </div>
                <p style={{ margin: 0, color: '#e5e7eb', fontSize: '0.92rem', lineHeight: '1.45' }}>
                  {data.notasEntrenador}
                </p>
              </div>
            )}

            {/* Desglose por ejercicio */}
            <h3 style={{ fontSize: '1rem', margin: '18px 0 10px', color: 'var(--w)' }}>
              Ejercicios y Series Realizadas ({data.sesionEjercicio.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.sesionEjercicio.map((ej) => {
                const nombre = ej.ejercicioEstandar?.nombre || ej.ejercicioPersonalizado?.nombre || 'Ejercicio';

                return (
                  <div
                    key={ej.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--line, rgba(255, 255, 255, 0.08))',
                      borderRadius: '12px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <b style={{ fontSize: '0.92rem' }}>{nombre}</b>
                      {ej.ejercicioPersonalizado && (
                        <span className="pill small" style={{ background: 'rgba(180, 255, 57, 0.1)', color: 'var(--g, #b4ff39)' }}>
                          Personalizado
                        </span>
                      )}
                    </div>

                    {ej.nota && (
                      <div
                        style={{
                          background: 'rgba(255, 107, 107, 0.08)',
                          borderLeft: '3px solid #ff6b6b',
                          padding: '6px 10px',
                          borderRadius: '0 6px 6px 0',
                          marginBottom: '10px',
                          fontSize: '0.84rem',
                          color: '#ffc9c9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                        <span><b>Nota del alumno:</b> {ej.nota}</span>
                      </div>
                    )}

                    {/* Tabla de sets */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ color: 'var(--muted, #9ca3af)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <th style={{ padding: '4px 6px' }}>Set</th>
                            <th style={{ padding: '4px 6px' }}>Peso</th>
                            <th style={{ padding: '4px 6px' }}>Reps</th>
                            <th style={{ padding: '4px 6px' }}>RPE / RIR</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ej.sesionEjercicioSet.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '5px 6px', fontWeight: 600 }}>#{s.numeroSet}</td>
                              <td style={{ padding: '5px 6px' }}>
                                <b style={{ color: 'var(--w)' }}>{s.pesoReal ?? s.pesoObjetivo ?? '—'}</b> kg
                              </td>
                              <td style={{ padding: '5px 6px' }}>
                                <b style={{ color: 'var(--w)' }}>{s.repeticionesRealizadas ?? s.repeticionesObjetivo ?? '—'}</b> reps
                              </td>
                              <td style={{ padding: '5px 6px', color: 'var(--muted)' }}>
                                {s.rpe ? `RPE ${s.rpe}` : s.rir !== null && s.rir !== undefined ? `RIR ${s.rir}` : '—'}
                              </td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: s.completado ? 'var(--g, #b4ff39)' : 'var(--muted)' }}>
                                {s.completado ? <CheckCircle2 size={15} style={{ display: 'inline', color: 'var(--g, #b4ff39)' }} /> : 'Incompleto'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
