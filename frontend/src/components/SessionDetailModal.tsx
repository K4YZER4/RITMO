import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, Clock, MessageSquare, X } from 'lucide-react';
import { Empty, Loading } from './Ui';
import { get } from '../lib/api';

export type SessionDetailResponse = {
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

export function SessionDetailModal({ sesionId, onClose }: { sesionId: string; onClose: () => void }) {
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                margin: '4px 0 10px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{data.rutina.nombre}</h2>
              <span className={`pill small ${data.idEstado === 2 ? 'success' : ''}`}>
                {data.idEstado === 2 ? 'Completada' : 'En curso'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                color: 'var(--muted, #9ca3af)',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CalendarDays size={14} />
                {new Date(data.fechaSesion).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--g, #b4ff39)',
                  fontWeight: 600,
                }}
              >
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--g, #b4ff39)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginBottom: '6px',
                  }}
                >
                  <MessageSquare size={16} /> Sensaciones y feedback del alumno al finalizar:
                </div>
                <p
                  style={{
                    margin: 0,
                    fontStyle: 'italic',
                    color: '#e5e7eb',
                    fontSize: '0.92rem',
                    lineHeight: '1.45',
                  }}
                >
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--accent, #e5a93b)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginBottom: '6px',
                  }}
                >
                  📋 Instrucción / Respuesta del entrenador:
                </div>
                <p
                  style={{
                    margin: 0,
                    color: '#e5e7eb',
                    fontSize: '0.92rem',
                    lineHeight: '1.45',
                  }}
                >
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
                const nombre =
                  ej.ejercicioEstandar?.nombre ||
                  ej.ejercicioPersonalizado?.nombre ||
                  'Ejercicio';

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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <b style={{ fontSize: '0.92rem' }}>{nombre}</b>
                      {ej.ejercicioPersonalizado && (
                        <span
                          className="pill small"
                          style={{
                            background: 'rgba(180, 255, 57, 0.1)',
                            color: 'var(--g, #b4ff39)',
                          }}
                        >
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
                        <span>
                          <b>Nota del alumno:</b> {ej.nota}
                        </span>
                      </div>
                    )}

                    {/* Tabla de sets */}
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          fontSize: '0.84rem',
                          borderCollapse: 'collapse',
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              color: 'var(--muted, #9ca3af)',
                              borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <th style={{ padding: '4px 6px' }}>Set</th>
                            <th style={{ padding: '4px 6px' }}>Peso</th>
                            <th style={{ padding: '4px 6px' }}>Reps</th>
                            <th style={{ padding: '4px 6px' }}>RPE / RIR</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ej.sesionEjercicioSet.map((s) => (
                            <tr
                              key={s.id}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            >
                              <td style={{ padding: '5px 6px', fontWeight: 600 }}>#{s.numeroSet}</td>
                              <td style={{ padding: '5px 6px' }}>
                                <b style={{ color: 'var(--w)' }}>
                                  {s.pesoReal ?? s.pesoObjetivo ?? '—'}
                                </b>{' '}
                                kg
                              </td>
                              <td style={{ padding: '5px 6px' }}>
                                <b style={{ color: 'var(--w)' }}>
                                  {s.repeticionesRealizadas ?? s.repeticionesObjetivo ?? '—'}
                                </b>{' '}
                                reps
                              </td>
                              <td style={{ padding: '5px 6px', color: 'var(--muted)' }}>
                                {s.rpe ? `RPE ${s.rpe}` : s.rir ? `RIR ${s.rir}` : '—'}
                              </td>
                              <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                                {s.completado ? (
                                  <span
                                    style={{
                                      color: 'var(--g, #b4ff39)',
                                      fontWeight: 600,
                                      fontSize: '0.78rem',
                                    }}
                                  >
                                    ✓ Hecho
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                                    Pendiente
                                  </span>
                                )}
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
