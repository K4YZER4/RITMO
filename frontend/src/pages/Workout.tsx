import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Timer } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading } from '../components/Ui';
import { get, patch, post } from '../lib/api';
import type { Session } from '../lib/types';
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
  const save = useMutation({
    mutationFn: ({ setId, peso, reps }: { setId: string; peso: number; reps: number }) =>
      patch(`/sesiones/${id}/sets/${setId}`, { peso, repeticiones: reps, completado: true }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['session', id] }),
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
      await post(`/sesiones/${id}/finalizar`, {});
      await nav('/app/progreso');
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : 'No se pudo finalizar la sesión');
    } finally {
      setFinishing(false);
    }
  };
  return (
    <div className="workout">
      <button className="back-inline" onClick={() => void nav('/app')}>
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
                      setValues({ ...values, [set.id]: { ...v, peso: e.target.value } })
                    }
                  />
                  <input
                    inputMode="numeric"
                    value={v.reps}
                    onChange={(e) =>
                      setValues({ ...values, [set.id]: { ...v, reps: e.target.value } })
                    }
                  />
                  <button
                    disabled={set.completado || save.isPending}
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
      {save.error && <div className="error">{save.error.message}</div>}
      {finishError && <div className="error">{finishError}</div>}
      <button
        className="button primary full finish"
        disabled={!completed || finishing}
        onClick={() => void finishWorkout()}
      >
        {finishing ? 'Finalizando…' : 'Finalizar entrenamiento'}
      </button>
    </div>
  );
}
