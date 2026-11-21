import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, MessageSquare, Timer, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from '../components/Ui';
import { del, get, patch, post } from '../lib/api';
import type { Session } from '../lib/types';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import {
  clearWorkoutDraft,
  enqueueWorkoutSet,
  loadWorkoutDraft,
  pendingWorkoutSets,
  removePendingWorkoutSet,
  saveWorkoutValues,
  syncWorkoutDraft,
} from '../lib/workoutDraft';
import { isRetryableApiError } from '../lib/api';

export function Workout() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: s, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => get<Session>(`/sesiones/${id}`),
  });
  const [values, setValues] = useState<Record<string, { peso: string; reps: string }>>({});
  const [finishError, setFinishError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [editingNoteExId, setEditingNoteExId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    const draft = loadWorkoutDraft(id);
    setValues(draft.values);
    setPendingIds(draft.pending.map((item) => item.setId));
    setDraftReady(true);
  }, [id]);

  useEffect(() => {
    if (!id || !draftReady) return;
    const timer = window.setTimeout(() => saveWorkoutValues(id, values), 300);
    return () => window.clearTimeout(timer);
  }, [id, values, draftReady]);

  useEffect(() => {
    if (!id) return;
    const synchronize = async () => {
      setOffline(!navigator.onLine);
      if (!navigator.onLine) return;
      await syncWorkoutDraft(id);
      setPendingIds(pendingWorkoutSets(id).map((item) => item.setId));
      void qc.invalidateQueries({ queryKey: ['session', id] });
    };
    const interval = window.setInterval(() => void synchronize(), 15000);
    const markOnline = () => void synchronize();
    const markOffline = () => setOffline(true);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    void synchronize();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, [id, qc]);

  const save = useMutation({
    mutationFn: ({
      setId,
      peso,
      reps,
      completado,
    }: {
      setId: string;
      peso: number;
      reps: number;
      completado: boolean;
    }) =>
      patch(`/sesiones/${id}/sets/${setId}`, { peso, repeticiones: reps, completado }),
    onMutate: ({ setId, peso, reps, completado }) => {
      enqueueWorkoutSet(id || '', { setId, peso, reps, completado });
      setPendingIds((current) => (current.includes(setId) ? current : [...current, setId]));
      void qc.cancelQueries({ queryKey: ['session', id] });
      const previous = qc.getQueryData<Session>(['session', id]);
      qc.setQueryData<Session>(['session', id], (current) =>
        current
          ? {
              ...current,
              sesionEjercicio: current.sesionEjercicio.map((exercise) => ({
                ...exercise,
                sesionEjercicioSet: exercise.sesionEjercicioSet.map((set) =>
                  set.id === setId
                    ? {
                        ...set,
                        pesoReal: String(peso),
                        repeticionesRealizadas: reps,
                        completado,
                      }
                    : set,
                ),
              })),
            }
          : current,
      );
      return { previous };
    },
    onError: (error, variables, context) => {
      if (!isRetryableApiError(error)) {
        if (context?.previous) qc.setQueryData(['session', id], context.previous);
        setPendingIds((current) => current.filter((setId) => setId !== variables.setId));
      } else {
        setOffline(!navigator.onLine);
      }
    },
    onSuccess: (_data, variables) => {
      removePendingWorkoutSet(id || '', variables.setId);
      const remaining = pendingWorkoutSets(id || '');
      saveWorkoutValues(id || '', values);
      setPendingIds(remaining.map((item) => item.setId));
      setOffline(false);
    },
  });

  const saveExerciseNote = useMutation({
    mutationFn: ({ sesionEjercicioId, nota }: { sesionEjercicioId: string; nota: string }) =>
      patch(`/sesiones/${id}/ejercicios/${sesionEjercicioId}/nota`, { nota }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['session', id] });
      setEditingNoteExId(null);
    },
  });

  if (isLoading || !s) return <Loading />;
  const completed = s.sesionEjercicio
    .flatMap((e) => e.sesionEjercicioSet)
    .filter((x) => x.completado).length;
  const total = s.sesionEjercicio.flatMap((e) => e.sesionEjercicioSet).length;

  const finishWorkout = async () => {
    setFinishing(true);
    setFinishError('');
    try {
      if (!navigator.onLine) {
        throw new Error('Conéctate a internet para sincronizar tus series antes de finalizar.');
      }
      const synchronization = await syncWorkoutDraft(id || '');
      setPendingIds(synchronization.failed.map((item) => item.setId));
      if (synchronization.permanent.length) {
        throw new Error(
          'Una o más series fueron rechazadas por el servidor. Revísalas e inténtalo nuevamente.',
        );
      }
      if (synchronization.failed.length) {
        throw new Error('No se pudieron sincronizar todas las series. Inténtalo nuevamente.');
      }
      await post(`/sesiones/${id}/finalizar`, {
        notas: sessionNotes.trim() || undefined,
      });
      clearWorkoutDraft(id || '');
      qc.removeQueries({ queryKey: ['session', id] });
      void qc.invalidateQueries({ queryKey: ['today'] });
      void qc.invalidateQueries({ queryKey: ['week'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      setShowFinishModal(false);
      void nav('/app/progreso', { replace: true });
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'No se pudo finalizar la sesión');
    } finally {
      setFinishing(false);
    }
  };

  const cancelWorkout = async () => {
    setFinishError('');
    try {
      await del(`/sesiones/${id}`);
      clearWorkoutDraft(id || '');
      qc.removeQueries({ queryKey: ['session', id] });
      void qc.invalidateQueries({ queryKey: ['today'] });
      void qc.invalidateQueries({ queryKey: ['week'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      setShowCancelConfirmation(false);
      void nav('/app', { replace: true });
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'No se pudo cancelar el entrenamiento');
      setShowCancelConfirmation(false);
    }
  };

  const exitWorkout = () => {
    setShowExitConfirmation(false);
    void nav('/app');
  };

  return (
    <div className="workout">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <button className="back-inline" onClick={() => setShowExitConfirmation(true)} style={{ margin: 0 }}>
          <ChevronLeft />
          Salir
        </button>
        <button
          type="button"
          onClick={() => setShowCancelConfirmation(true)}
          style={{
            background: 'transparent',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          <Trash2 size={14} /> Cancelar entrenamiento
        </button>
      </div>

      <div className="workout-head">
        <span className="eyebrow">SESIÓN EN CURSO</span>
        <h1>{s.rutina.nombre}</h1>
        <div className="progress-bar">
          <i style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
        </div>
        <small>
          {completed} de {total} sets completados
        </small>
      </div>

      {s.sesionEjercicio.map((ex, index) => (
        <Card key={ex.id} className="exercise-card">
          <div className="exercise-title">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{ex.ejercicioEstandar?.nombre || ex.ejercicioPersonalizado?.nombre}</h2>
              <small>
                <Timer />
                Descansa según tu ritmo
              </small>
            </div>
          </div>

          {/* Notas por ejercicio */}
          {editingNoteExId === ex.id ? (
            <div
              style={{
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, rgba(255, 255, 255, 0.1))',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px' }}>
                Nota / molestia en este ejercicio:
              </label>
              <textarea
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ej. Sentí molestia en el hombro, o fue muy fácil..."
                style={{
                  width: '100%',
                  background: '#090c0a',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={() => setEditingNoteExId(null)}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button small primary"
                  disabled={saveExerciseNote.isPending}
                  onClick={() => {
                    saveExerciseNote.mutate({ sesionEjercicioId: ex.id, nota: noteDraft.trim() });
                  }}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  {saveExerciseNote.isPending ? 'Guardando…' : 'Guardar nota'}
                </button>
              </div>
            </div>
          ) : ex.nota ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(180, 255, 57, 0.06)',
                border: '1px solid rgba(180, 255, 57, 0.22)',
                borderRadius: '8px',
                padding: '8px 12px',
                marginTop: '10px',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb' }}>
                <MessageSquare size={14} style={{ color: 'var(--lime, #b4ff39)', flexShrink: 0 }} />
                <span><b>Nota:</b> {ex.nota}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingNoteExId(ex.id);
                  setNoteDraft(ex.nota || '');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--lime, #b4ff39)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  padding: 0,
                  marginLeft: '8px',
                  flexShrink: 0,
                }}
              >
                Editar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingNoteExId(ex.id);
                setNoteDraft('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: '1px dashed rgba(255, 255, 255, 0.16)',
                color: 'var(--muted, #9ca3af)',
                fontSize: '0.78rem',
                borderRadius: '6px',
                padding: '4px 10px',
                marginTop: '10px',
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={13} /> Añadir nota o molestia para este ejercicio
            </button>
          )}

          <div className="sets-table">
            <div className="set-head">
              <span>SET</span>
              <span>KG</span>
              <span>REPS</span>
              <span />
            </div>
            {ex.sesionEjercicioSet.map((set) => {
              const v = values[set.id] || {
                peso: set.pesoReal || set.pesoObjetivo || '',
                reps: String(set.repeticionesRealizadas || set.repeticionesObjetivo || ''),
              };
              return (
                <div className={`set-input ${set.completado ? 'done' : ''}`} key={set.id}>
                  <b>{set.numeroSet}</b>
                  <input
                    inputMode="decimal"
                    value={v.peso}
                    onChange={(e) =>
                      setValues((current) => ({
                        ...current,
                        [set.id]: { ...v, peso: e.target.value },
                      }))
                    }
                  />
                  <input
                    inputMode="numeric"
                    value={v.reps}
                    onChange={(e) =>
                      setValues((current) => ({
                        ...current,
                        [set.id]: { ...v, reps: e.target.value },
                      }))
                    }
                  />
                  <button
                    className={set.completado ? 'active' : ''}
                    disabled={save.isPending && save.variables?.setId === set.id}
                    title={set.completado ? 'Toca para desmarcar' : 'Toca para completar'}
                    onClick={() => {
                      if (
                        !v.peso ||
                        !v.reps ||
                        Number.isNaN(Number(v.peso)) ||
                        Number.isNaN(Number(v.reps)) ||
                        Number(v.peso) < 0 ||
                        Number(v.reps) < 0
                      )
                        return;
                      const nextCompletado = !set.completado;
                      save.mutate({
                        setId: set.id,
                        peso: Number(v.peso),
                        reps: Number(v.reps),
                        completado: nextCompletado,
                      });
                    }}
                  >
                    <Check />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {save.error && !isRetryableApiError(save.error) && (
        <div className="error">{save.error.message}</div>
      )}
      {(offline || pendingIds.length > 0) && (
        <div className="workout-sync-status">
          {offline
            ? 'Sin conexión. Tu progreso se guardará en este dispositivo.'
            : `${pendingIds.length} serie${pendingIds.length === 1 ? '' : 's'} pendiente${pendingIds.length === 1 ? '' : 's'} de sincronizar.`}
        </div>
      )}
      {finishError && <div className="error">{finishError}</div>}

      <button
        className="button primary full finish"
        disabled={!completed || finishing}
        onClick={() => setShowFinishModal(true)}
      >
        {finishing ? 'Finalizando…' : 'Finalizar entrenamiento'}
      </button>

      {/* Modal para ingresar sensaciones y finalizar */}
      {showFinishModal && (
        <div className="modal-backdrop" onClick={() => setShowFinishModal(false)} style={{ zIndex: 100 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '100%' }}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowFinishModal(false)}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
            <span className="eyebrow">FINALIZAR ENTRENAMIENTO</span>
            <h2 style={{ margin: '4px 0 10px' }}>¡Gran trabajo hoy! 💪</h2>
            <p style={{ color: 'var(--muted, #9ca3af)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Completaste {completed} de {total} series. Puedes dejar comentarios o sensaciones generales para tu entrenador.
            </p>

            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span className="label-head" style={{ marginBottom: '6px' }}>
                Notas y feedback para el coach (opcional)
              </span>
              <textarea
                rows={3}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Ej. Me sentí con buena fuerza, subí 2.5kg en el último set..."
                style={{
                  width: '100%',
                  background: '#090c0a',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </label>

            {finishError && <div className="error" style={{ marginBottom: '12px' }}>{finishError}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="button secondary"
                style={{ flex: 1 }}
                onClick={() => setShowFinishModal(false)}
              >
                Volver
              </button>
              <button
                type="button"
                className="button primary"
                style={{ flex: 1 }}
                disabled={finishing}
                onClick={() => void finishWorkout()}
              >
                {finishing ? 'Guardando…' : 'Confirmar y terminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitConfirmation && (
        <ConfirmActionModal
          title="¿Salir del entrenamiento?"
          description="Tu progreso confirmado se guarda automáticamente. Podrás continuar esta sesión más tarde; las series pendientes se sincronizarán al recuperar la conexión."
          confirmLabel="Salir y continuar después"
          onClose={() => setShowExitConfirmation(false)}
          onConfirm={exitWorkout}
        />
      )}

      {showCancelConfirmation && (
        <ConfirmActionModal
          title="¿Cancelar este entrenamiento?"
          description="Esta sesión se descartará por completo y no se registrará en tu historial. ¿Estás seguro de que deseas cancelarla?"
          confirmLabel="Sí, cancelar sesión"
          onClose={() => setShowCancelConfirmation(false)}
          onConfirm={() => void cancelWorkout()}
        />
      )}
    </div>
  );
}
