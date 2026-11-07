import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus, Save, UserPlus, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Card, Empty, Loading, Page } from '../components/Ui';
import { SelectMenu } from '../components/SelectMenu';
import { get, post, patch } from '../lib/api';
import type { Catalogs, ExerciseLibrary, Routine, Student } from '../lib/types';

type DraftExercise = {
  id: string;
  kind: 'standard' | 'custom';
  series: number;
  reps: number;
  weight: string;
};

export function Routines() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Routine | null>(null);
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [day, setDay] = useState('1');
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState('');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['routines'],
    queryFn: () => get<Routine[]>('/rutinas'),
  });
  const { data: catalogs } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => get<Catalogs>('/catalogos'),
  });
  const { data: exercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => get<ExerciseLibrary>('/ejercicios'),
  });
  const { data: routineDetail } = useQuery({
    queryKey: ['routine', selected?.id],
    queryFn: () => get<Routine>(`/rutinas/${selected?.id}`),
    enabled: Boolean(selected?.id),
  });
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<Student[]>('/entrenador/alumnos'),
  });
  const create = useMutation({
    mutationFn: () =>
      post('/rutinas', {
        nombre: name,
        descripcion: description,
        id_categoria_rutina: Number(category),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['routines'] });
      setOpen(false);
      setName('');
      setDescription('');
      setCategory('');
    },
  });
  const saveExercises = useMutation({
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
      return patch(`/rutinas/${selected?.id}/ejercicios`, {
        ejercicios: draft.map((item, index) => ({
          ...(item.kind === 'standard'
            ? { id_ejercicio_estandar: item.id }
            : { id_ejercicio_personalizado: item.id }),
          orden: index + 1,
          series: item.series,
          repeticiones: item.reps,
          ...(item.weight ? { peso_objetivo: Number(item.weight) } : {}),
        })),
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['routines'] }),
  });
  const assign = useMutation({
    mutationFn: () =>
      post(`/rutinas/${selected?.id}/asignaciones`, {
        id_alumno: studentId,
        numero_dia: Number(day),
        fecha_inicio: start,
        ...(end ? { fecha_fin: end } : {}),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['routines'] });
      setAssignOpen(false);
      setSelected(null);
    },
  });
  useEffect(() => {
    if (routineDetail?.rutinaEjercicio) {
      setDraft(
        routineDetail.rutinaEjercicio.map((item) => ({
          id: item.ejercicioEstandar?.id ?? item.ejercicioPersonalizado?.id ?? '',
          kind: item.ejercicioEstandar ? 'standard' : 'custom',
          series: item.series,
          reps: item.repeticiones,
          weight: item.pesoObjetivo ?? '',
        })),
      );
    }
  }, [routineDetail]);
  if (isLoading) return <Loading />;
  if (isError) return <Empty>No se pudieron cargar las rutinas.</Empty>;
  function openEditor(routine: Routine) {
    setSelected(routine);
    setDraft(
      (routine.rutinaEjercicio ?? []).map((item) => ({
        id: item.ejercicioEstandar?.id ?? item.ejercicioPersonalizado?.id ?? '',
        kind: item.ejercicioEstandar ? 'standard' : 'custom',
        series: item.series,
        reps: item.repeticiones,
        weight: item.pesoObjetivo ?? '',
      })),
    );
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }
  return (
    <Page
      eyebrow="PROGRAMACIÓN"
      title="Biblioteca de rutinas"
      action={
        <button className="button primary" onClick={() => setOpen(true)}>
          <Plus /> Nueva rutina
        </button>
      }
    >
      <div className="routine-grid">
        {data?.map((routine) => (
          <Card key={routine.id}>
            <div className="routine-icon">
              <Dumbbell />
            </div>
            <span className="status">{routine.activa ? 'ACTIVA' : 'INACTIVA'}</span>
            <h2>{routine.nombre}</h2>
            <p>{routine.descripcion || 'Sin descripción'}</p>
            <div className="routine-stats">
              <span>
                <b>{routine._count?.rutinaEjercicio || 0}</b> ejercicios
              </span>
              <span>
                <b>{routine._count?.usuarioRutina || 0}</b> asignaciones
              </span>
            </div>
            <div className="card-actions">
              <button className="button ghost" onClick={() => openEditor(routine)}>
                Editar ejercicios
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setSelected(routine);
                  setAssignOpen(true);
                }}
              >
                <UserPlus /> Asignar
              </button>
            </div>
          </Card>
        ))}
      </div>
      {!data?.length && <Empty>Crea tu primera rutina para comenzar.</Empty>}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">NUEVA RUTINA</span>
            <h2>Construye la base</h2>
            <label>
              Nombre
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label>
              Descripción
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </label>
            <label>
              Categoría
              <SelectMenu
                value={category}
                placeholder="Selecciona una categoría"
                options={(catalogs?.categoriasRutina || []).map((item) => ({
                  value: String(item.id),
                  label: item.nombre.replaceAll('_', ' '),
                  description: item.descripcion,
                }))}
                onChange={setCategory}
              />
            </label>
            {create.error && <div className="error">{create.error.message}</div>}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="button primary" disabled={create.isPending}>
                Crear rutina
              </button>
            </div>
          </form>
        </div>
      )}
      {selected && !assignOpen && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="modal wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X />
            </button>
            <span className="eyebrow">CONSTRUCTOR</span>
            <h2>{selected.nombre}</h2>
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
                  if (id)
                    setDraft([
                      ...draft,
                      { id, kind: kind as DraftExercise['kind'], series: 3, reps: 10, weight: '' },
                    ]);
                }}
              />
            </label>
            {draft.map((item, index) => (
              <div className="exercise-builder" key={`${item.kind}-${item.id}-${index}`}>
                <b>
                  {index + 1}.{' '}
                  {
                    exercises?.[item.kind === 'standard' ? 'estandar' : 'personalizados'].find(
                      (exercise) => exercise.id === item.id,
                    )?.nombre
                  }
                </b>
                <input
                  type="number"
                  min="1"
                  value={item.series}
                  onChange={(e) =>
                    setDraft(
                      draft.map((x, i) =>
                        i === index ? { ...x, series: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  placeholder="Series"
                />
                <input
                  type="number"
                  min="1"
                  value={item.reps}
                  onChange={(e) =>
                    setDraft(
                      draft.map((x, i) =>
                        i === index ? { ...x, reps: Number(e.target.value) } : x,
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
                  onChange={(e) =>
                    setDraft(
                      draft.map((x, i) => (i === index ? { ...x, weight: e.target.value } : x)),
                    )
                  }
                  placeholder="Kg"
                />
                <button onClick={() => setDraft(draft.filter((_, i) => i !== index))}>
                  <X />
                </button>
              </div>
            ))}
            {saveExercises.error && <div className="error">{saveExercises.error.message}</div>}
            <button
              className="button primary full"
              onClick={() => void saveExercises.mutateAsync()}
              disabled={!draft.length || saveExercises.isPending}
            >
              <Save /> Guardar ejercicios
            </button>
          </section>
        </div>
      )}
      {assignOpen && selected && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setAssignOpen(false);
            setSelected(null);
          }}
        >
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              assign.mutate();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="eyebrow">ASIGNAR RUTINA</span>
            <h2>{selected.nombre}</h2>
            <label>
              Alumno
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                <option value="">Selecciona un alumno</option>
                {students?.map((student) => (
                  <option key={student.idUsuario} value={student.idUsuario}>
                    {student.usuario.nombre} {student.usuario.apellidoPaterno}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Día
              <select value={day} onChange={(e) => setDay(e.target.value)}>
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
                  (name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Fecha de inicio
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              Fecha final opcional
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            {assign.error && <div className="error">{assign.error.message}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setAssignOpen(false);
                  setSelected(null);
                }}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={assign.isPending}>
                Asignar rutina
              </button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
