import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from '../components/Ui';
import { get, patch, post } from '../lib/api';
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
    mutationFn: ({ setId, peso, reps }: { setId: string; peso: number; reps: number }) =>
      patch(`/sesiones/${id}/sets/${setId}`, { peso, repeticiones: reps, completado: true }),
    onMutate: ({ setId, peso, reps }) => {
      enqueueWorkoutSet(id || '', { setId, peso, reps });
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
                        completado: true,
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
      await post(`/sesiones/${id}/finalizar`, {});
      clearWorkoutDraft(id || '');
      qc.removeQueries({ queryKey: ['session', id] });
      void qc.invalidateQueries({ queryKey: ['today'] });
      void qc.invalidateQueries({ queryKey: ['week'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      void nav('/app/progreso', { replace: true });
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'No se pudo finalizar la sesión');
    } finally {
      setFinishing(false);
    }
  };
  const exitWorkout = () => {
    setShowExitConfirmation(false);
    void nav('/app');
  };
  return (
    <div className="workout">
      <button className="back-inline" onClick={() => setShowExitConfirmation(true)}>
        <ChevronLeft />
        Salir
      </button>
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
                    disabled={
                      set.completado || (save.isPending && save.variables?.setId === set.id)
                    }
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
                      save.mutate({ setId: set.id, peso: Number(v.peso), reps: Number(v.reps) });
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
        onClick={() => void finishWorkout()}
      >
        {finishing ? 'Finalizando…' : 'Finalizar entrenamiento'}
      </button>
      {showExitConfirmation && (
        <ConfirmActionModal
          title="¿Salir del entrenamiento?"
          description="Tu progreso confirmado se guarda automáticamente. Podrás continuar esta sesión más tarde; las series pendientes se sincronizarán al recuperar la conexión."
          confirmLabel="Salir y continuar después"
          onClose={() => setShowExitConfirmation(false)}
          onConfirm={exitWorkout}
        />
      )}
    </div>
  );
}
