import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { patch, get } from '../lib/api';
import { SelectMenu } from './SelectMenu';
import type { ExerciseLibrary, Routine } from '../lib/types';

type DraftExercise = {
  id: string;
  kind: 'standard' | 'custom';
  series: number;
  reps: number;
  weight: string;
  note: string;
  link: string;
};

export function RoutineExerciseEditor({
  routine,
  onClose,
  onSaved,
}: {
  routine: Routine;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => get<ExerciseLibrary>('/ejercicios'),
  });
  const detail = useQuery({
    queryKey: ['routine', routine.id],
    queryFn: () => get<Routine>(`/rutinas/${routine.id}`),
  });
  const save = useMutation({
    mutationFn: () => {
      if (
        draft.some(
          (item) => item.series < 1 || item.reps < 1 || (item.weight && Number(item.weight) < 0),
        )
      ) {
        throw new Error(
          'Series y repeticiones deben ser mayores a 0; el peso no puede ser negativo.',
        );
      }
      return patch(`/rutinas/${routine.id}/ejercicios`, {
        ejercicios: draft.map((item, index) => ({
          ...(item.kind === 'standard'
            ? { id_ejercicio_estandar: item.id }
            : { id_ejercicio_personalizado: item.id }),
          orden: index + 1,
          series: item.series,
          repeticiones: item.reps,
          ...(item.weight ? { peso_objetivo: Number(item.weight) } : {}),
          ...(item.note ? { nota_entrenador: item.note } : {}),
          ...(item.link ? { link_apoyo: item.link } : {}),
        })),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student'] });
      await qc.invalidateQueries({ queryKey: ['routine', routine.id] });
      onSaved();
    },
  });
  useEffect(() => {
    const source = detail.data?.rutinaEjercicio ?? routine.rutinaEjercicio ?? [];
    setDraft(
      source.map((item) => ({
        id: item.ejercicioEstandar?.id ?? item.ejercicioPersonalizado?.id ?? '',
        kind: item.ejercicioEstandar ? 'standard' : 'custom',
        series: item.series,
        reps: item.repeticiones,
        weight: item.pesoObjetivo ?? '',
        note: item.notaEntrenador ?? '',
        link: item.linkApoyo ?? '',
      })),
    );
  }, [detail.data, routine.rutinaEjercicio]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal wide" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X />
        </button>
        <span className="eyebrow">EDITAR RUTINA ASIGNADA</span>
        <h2>{routine.nombre}</h2>
        <p>Actualiza ejercicios, series, repeticiones y notas sin salir del perfil del alumno.</p>
        <label>
          Ejercicio
          <SelectMenu
            value=""
            placeholder="Añadir ejercicio"
            options={[
              ...(exercises?.estandar || []).map((item) => ({
                value: `standard:${item.id}`,
                label: item.nombre,
                description: item.descripcion,
              })),
              ...(exercises?.personalizados || []).map((item) => ({
                value: `custom:${item.id}`,
                label: item.nombre,
                description: 'Ejercicio personalizado',
              })),
            ]}
            onChange={(value) => {
              const [kind, id] = value.split(':');
              if (id) {
                setDraft((current) => [
                  ...current,
                  {
                    id,
                    kind: kind as DraftExercise['kind'],
                    series: 3,
                    reps: 10,
                    weight: '',
                    note: '',
                    link: '',
                  },
                ]);
              }
            }}
          />
        </label>
        {draft.map((item, index) => (
          <div className="exercise-builder" key={`${item.kind}-${item.id}-${index}`}>
            <b>
              {index + 1}.{' '}
              {exercises?.[item.kind === 'standard' ? 'estandar' : 'personalizados'].find(
                (exercise) => exercise.id === item.id,
              )?.nombre || 'Ejercicio'}
            </b>
            <input
              type="number"
              min="1"
              value={item.series}
              onChange={(event) =>
                setDraft(
                  draft.map((x, i) =>
                    i === index ? { ...x, series: Number(event.target.value) } : x,
                  ),
                )
              }
              placeholder="Series"
            />
            <input
              type="number"
              min="1"
              value={item.reps}
              onChange={(event) =>
                setDraft(
                  draft.map((x, i) =>
                    i === index ? { ...x, reps: Number(event.target.value) } : x,
                  ),
                )
              }
              placeholder="Reps"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.weight}
              onChange={(event) =>
                setDraft(
                  draft.map((x, i) => (i === index ? { ...x, weight: event.target.value } : x)),
                )
              }
              placeholder="Kg"
            />
            <input
              value={item.note}
              onChange={(event) =>
                setDraft(
                  draft.map((x, i) => (i === index ? { ...x, note: event.target.value } : x)),
                )
              }
              placeholder="Nota del entrenador"
              maxLength={1000}
            />
            <input
              type="url"
              value={item.link}
              onChange={(event) =>
                setDraft(
                  draft.map((x, i) => (i === index ? { ...x, link: event.target.value } : x)),
                )
              }
              placeholder="Link de apoyo (https://...)"
            />
            <button type="button" onClick={() => setDraft(draft.filter((_, i) => i !== index))}>
              <X />
            </button>
          </div>
        ))}
        {save.error && <div className="error">{save.error.message}</div>}
        <button
          className="button primary full"
          onClick={() => void save.mutateAsync()}
          disabled={!draft.length || save.isPending || detail.isLoading}
        >
          <Save /> {save.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </section>
    </div>
  );
}
