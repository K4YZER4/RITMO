import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { get, patch, post } from '../lib/api';
import { SelectMenu } from './SelectMenu';
import type { Catalogs, ExerciseLibrary, Routine } from '../lib/types';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [exerciseImage, setExerciseImage] = useState('');
  const [exerciseLink, setExerciseLink] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const { data: exercises } = useQuery<ExerciseLibrary>({
    queryKey: ['exercises'],
    queryFn: () => get<ExerciseLibrary>('/ejercicios'),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => qc.getQueryData<ExerciseLibrary>(['exercises']),
  });
  const { data: catalogs } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => get<Catalogs>('/catalogos'),
    enabled: createOpen,
    staleTime: 10 * 60 * 1000,
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
  const createExercise = useMutation({
    mutationFn: () =>
      post('/ejerciciosPersonalizados', {
        nombre: exerciseName,
        descripcion: exerciseDescription,
        ...(exerciseImage ? { url_imagen: exerciseImage } : {}),
        ...(exerciseLink ? { link_informacion: exerciseLink } : {}),
        musculos: muscles.map(Number),
        equipos: equipment.map(Number),
      }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['exercises'] });
      setCreateOpen(false);
      setExerciseName('');
      setExerciseDescription('');
      setExerciseImage('');
      setExerciseLink('');
      setMuscles([]);
      setEquipment([]);
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
        <button type="button" className="button dark full" onClick={() => setCreateOpen(true)}>
          <Plus /> Crear ejercicio personalizado
        </button>
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
      {createOpen && (
        <div className="modal-backdrop nested-modal" onClick={() => setCreateOpen(false)}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              createExercise.mutate();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setCreateOpen(false)}>
              <X />
            </button>
            <span className="eyebrow">BIBLIOTECA PERSONAL</span>
            <h2>Crear ejercicio</h2>
            <label>
              Nombre
              <input
                value={exerciseName}
                onChange={(event) => setExerciseName(event.target.value)}
                required
              />
            </label>
            <label>
              Descripción
              <textarea
                value={exerciseDescription}
                onChange={(event) => setExerciseDescription(event.target.value)}
                required
              />
            </label>
            <label>
              URL de imagen opcional
              <input
                type="url"
                value={exerciseImage}
                onChange={(event) => setExerciseImage(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              Link informativo opcional
              <input
                type="url"
                value={exerciseLink}
                onChange={(event) => setExerciseLink(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              Músculos
              <SelectMenu
                value=""
                placeholder="Añadir músculo"
                options={(catalogs?.musculos || [])
                  .filter((item) => !muscles.includes(item.id))
                  .map((item) => ({ value: item.id, label: item.nombre }))}
                onChange={(value) => setMuscles((current) => [...current, value])}
              />
            </label>
            <div className="chips">
              {muscles.map((id) => (
                <button
                  type="button"
                  className="chip"
                  key={id}
                  onClick={() => setMuscles(muscles.filter((item) => item !== id))}
                >
                  {catalogs?.musculos.find((item) => item.id === id)?.nombre} <X size={14} />
                </button>
              ))}
            </div>
            <label>
              Equipo opcional
              <SelectMenu
                value=""
                placeholder="Añadir equipo"
                options={(catalogs?.equipos || [])
                  .filter((item) => !equipment.includes(item.id))
                  .map((item) => ({ value: item.id, label: item.nombre }))}
                onChange={(value) => setEquipment((current) => [...current, value])}
              />
            </label>
            <div className="chips">
              {equipment.map((id) => (
                <button
                  type="button"
                  className="chip"
                  key={id}
                  onClick={() => setEquipment(equipment.filter((item) => item !== id))}
                >
                  {catalogs?.equipos.find((item) => item.id === id)?.nombre} <X size={14} />
                </button>
              ))}
            </div>
            {createExercise.error && <div className="error">{createExercise.error.message}</div>}
            <button
              className="button primary full"
              disabled={!muscles.length || createExercise.isPending}
            >
              {createExercise.isPending ? 'Creando…' : 'Crear ejercicio'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
