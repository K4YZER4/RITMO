import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Card, Empty, Loading, Page } from '../components/Ui';
import { SelectMenu } from '../components/SelectMenu';
import { del, get, patch, post } from '../lib/api';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import type { Catalogs, ExerciseLibrary } from '../lib/types';

export function Exercises() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseLibrary['personalizados'][number] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<
    ExerciseLibrary['personalizados'][number] | null
  >(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [image, setImage] = useState('');
  const [informationLink, setInformationLink] = useState('');
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: () => get<Catalogs>('/catalogos') });
  const exercises = useQuery({
    queryKey: ['exercises'],
    queryFn: () => get<ExerciseLibrary>('/ejercicios'),
    staleTime: 5 * 60 * 1000,
    placeholderData: () => qc.getQueryData<ExerciseLibrary>(['exercises']),
  });
  const create = useMutation({
    mutationFn: () =>
      post('/ejerciciosPersonalizados', {
        nombre: name,
        descripcion: description,
        musculos: muscles.map(Number),
        equipos: equipment.map(Number),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['exercises'] });
      closeForm();
    },
  });
  const update = useMutation({
    mutationFn: () =>
      patch(`/ejerciciosPersonalizados/${editing?.id}`, {
        nombre: name,
        descripcion: description,
        ...(image ? { url_imagen: image } : {}),
        ...(informationLink ? { link_informacion: informationLink } : {}),
        musculos: muscles.map(Number),
        equipos: equipment.map(Number),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['exercises'] });
      closeForm();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/ejerciciosPersonalizados/${id}`),
    onSuccess: async () => {
      setArchiveTarget(null);
      await qc.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setName('');
    setDescription('');
    setMuscles([]);
    setEquipment([]);
    setImage('');
    setInformationLink('');
  };
  const editExercise = (exercise: ExerciseLibrary['personalizados'][number]) => {
    setEditing(exercise);
    setName(exercise.nombre);
    setDescription(exercise.descripcion || '');
    setImage(exercise.urlImagen || '');
    setInformationLink(exercise.linkInformacion || '');
    setMuscles((exercise.ejercicioPersonalizadoMusculo || []).map((item) => item.musculo.id));
    setEquipment((exercise.ejercicioPersonalizadoEquipo || []).map((item) => item.equipo.id));
    setOpen(true);
  };
  if (exercises.isLoading) return <Loading />;
  return (
    <Page
      eyebrow="BIBLIOTECA"
      title="Ejercicios"
      action={
        <button className="button primary" onClick={() => setOpen(true)}>
          <Plus /> Nuevo ejercicio
        </button>
      }
    >
      <div className="exercise-library-head">
        <div>
          <span className="eyebrow">PERSONALIZADOS</span>
          <h2>Tu biblioteca de ejercicios</h2>
          <p>Crea movimientos propios y úsalos en cualquiera de tus rutinas.</p>
        </div>
        <div className="exercise-library-count">
          <strong>{exercises.data?.personalizados.length || 0}</strong>
          <span>ejercicios creados</span>
        </div>
      </div>
      <div className="exercise-library-grid">
        {(exercises.data?.personalizados || []).map((exercise) => (
          <Card key={exercise.id}>
            <div className="routine-icon">
              <Dumbbell />
            </div>
            <h2>{exercise.nombre}</h2>
            <p>{exercise.descripcion || 'Sin descripción'}</p>
            <div className="list-actions">
              <button
                type="button"
                className="button ghost compact"
                onClick={() => editExercise(exercise)}
              >
                <Edit3 size={15} /> Editar
              </button>
              <button
                type="button"
                className="button danger compact"
                onClick={() => setArchiveTarget(exercise)}
              >
                <Trash2 size={15} /> Archivar
              </button>
            </div>
            <div className="exercise-use-list">
              <span className="eyebrow">USADO EN</span>
              {exercise.rutinaEjercicio?.filter((item) => item.rutina.activa).length ? (
                exercise.rutinaEjercicio
                  .filter((item) => item.rutina.activa)
                  .map((item) => <small key={item.id}>{item.rutina.nombre}</small>)
              ) : (
                <small className="muted">Todavía no está en una rutina activa.</small>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!exercises.data?.personalizados.length && (
        <Empty>Aún no tienes ejercicios personalizados. Crea el primero.</Empty>
      )}
      {open && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <span className="eyebrow">BIBLIOTECA PERSONAL</span>
            <h2>{editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2>
            <label>
              Nombre
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              URL de imagen opcional
              <input type="url" value={image} onChange={(event) => setImage(event.target.value)} />
            </label>
            <label>
              Link informativo opcional
              <input
                type="url"
                value={informationLink}
                onChange={(event) => setInformationLink(event.target.value)}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>
            <label>
              Músculos
              <SelectMenu
                value=""
                placeholder="Añadir músculo"
                options={(catalogs.data?.musculos || [])
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
                  {catalogs.data?.musculos.find((item) => item.id === id)?.nombre} <X size={14} />
                </button>
              ))}
            </div>
            <label>
              Equipo opcional
              <SelectMenu
                value=""
                placeholder="Añadir equipo"
                options={(catalogs.data?.equipos || [])
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
                  {catalogs.data?.equipos.find((item) => item.id === id)?.nombre} <X size={14} />
                </button>
              ))}
            </div>
            {(create.error || update.error) && (
              <div className="error">{(create.error || update.error)?.message}</div>
            )}
            <button
              className="button primary full"
              disabled={!muscles.length || create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? 'Guardando…' : 'Guardar ejercicio'}
            </button>
          </form>
        </div>
      )}
      {archiveTarget && (
        <ConfirmActionModal
          title={`¿Archivar ${archiveTarget.nombre}?`}
          description="Se quitará de tu biblioteca, pero se conservarán las rutinas, sesiones y récords históricos."
          confirmLabel="Archivar ejercicio"
          busy={remove.isPending}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => remove.mutate(archiveTarget.id)}
        />
      )}
    </Page>
  );
}
