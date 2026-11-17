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
  const [tab, setTab] = useState<'personalizados' | 'estandar'>('personalizados');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseLibrary['personalizados'][number] | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<
    ExerciseLibrary['personalizados'][number] | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<
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
  const archived = useQuery({
    queryKey: ['archived-exercises'],
    queryFn: () => get<ExerciseLibrary['personalizados']>('/ejercicios/archivados'),
    staleTime: 5 * 60 * 1000,
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['exercises'] }),
        qc.invalidateQueries({ queryKey: ['archived-exercises'] }),
      ]);
    },
  });
  const deleteArchived = useMutation({
    mutationFn: (id: string) => del(`/ejerciciosPersonalizados/${id}`),
    onSuccess: async () => {
      setDeleteTarget(null);
      await qc.invalidateQueries({ queryKey: ['archived-exercises'] });
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
      <div className="exercise-tabs">
        <button
          type="button"
          className={`exercise-tab-btn ${tab === 'personalizados' ? 'active' : ''}`}
          onClick={() => setTab('personalizados')}
        >
          Personalizados
          <span className="tab-count">{exercises.data?.personalizados.length || 0}</span>
        </button>
        <button
          type="button"
          className={`exercise-tab-btn ${tab === 'estandar' ? 'active' : ''}`}
          onClick={() => setTab('estandar')}
        >
          Catálogo estándar
          <span className="tab-count">{exercises.data?.estandar.length || 0}</span>
        </button>
      </div>

      {tab === 'personalizados' && (
        <>
          <div className="exercise-library-head">
            <div>
              <span className="eyebrow">FUERA DE CATÁLOGO</span>
              <h2>Ejercicios personalizados</h2>
              <p>Movimientos exclusivos creados por ti fuera del catálogo base para enriquecer tus rutinas.</p>
            </div>
            <div className="exercise-library-count">
              <strong>{exercises.data?.personalizados.length || 0}</strong>
              <span>creados</span>
            </div>
          </div>
          <div className="exercise-library-grid">
            {(exercises.data?.personalizados || []).map((exercise) => (
              <Card key={exercise.id}>
                <span className="custom-exercise-badge">Personalizado · Fuera de catálogo</span>
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
                  <div className="exercise-use-badges">
                    {exercise.rutinaEjercicio?.filter((item) => item.rutina.activa).length ? (
                      exercise.rutinaEjercicio
                        .filter((item) => item.rutina.activa)
                        .map((item) => (
                          <span key={item.id} className="routine-tag">
                            {item.rutina.nombre}
                          </span>
                        ))
                    ) : (
                      <small className="muted">Todavía no está en una rutina activa.</small>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {!exercises.data?.personalizados.length && (
            <Empty>Aún no tienes ejercicios personalizados creados fuera del catálogo.</Empty>
          )}

          <section className="archived-section">
            <div className="card-head">
              <div>
                <span className="eyebrow">HISTORIAL</span>
                <h2>Ejercicios archivados</h2>
              </div>
              <small>{archived.data?.length || 0} archivados</small>
            </div>
            {archived.data?.length ? (
              <div className="exercise-library-grid">
                {archived.data.map((exercise) => (
                  <Card key={exercise.id} className="archived-card">
                    <span className="custom-exercise-badge">Archivado</span>
                    <div className="routine-icon">
                      <Dumbbell />
                    </div>
                    <h2>{exercise.nombre}</h2>
                    <p>{exercise.descripcion || 'Sin descripción'}</p>
                    <small className="muted">Solo lectura · Se conserva el historial.</small>
                    <button
                      type="button"
                      className="button danger compact"
                      onClick={() => setDeleteTarget(exercise)}
                    >
                      <Trash2 size={15} /> Eliminar definitivamente
                    </button>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty>No hay ejercicios archivados.</Empty>
            )}
          </section>
        </>
      )}

      {tab === 'estandar' && (
        <>
          <div className="exercise-library-head">
            <div>
              <span className="eyebrow">BIBLIOTECA OFICIAL</span>
              <h2>Catálogo estándar</h2>
              <p>Ejercicios base oficiales incluidos en RITMO con biomecánica y patrones estándar.</p>
            </div>
            <div className="exercise-library-count">
              <strong>{exercises.data?.estandar.length || 0}</strong>
              <span>estándar</span>
            </div>
          </div>
          <div className="exercise-library-grid">
            {(exercises.data?.estandar || []).map((exercise) => (
              <Card key={exercise.id}>
                <span className="standard-exercise-badge">Catálogo estándar</span>
                <div className="routine-icon">
                  <Dumbbell />
                </div>
                <h2>{exercise.nombre}</h2>
                <p>{exercise.descripcion || 'Sin descripción'}</p>
                <div className="exercise-use-list">
                  <span className="eyebrow">USADO EN TUS RUTINAS</span>
                  <div className="exercise-use-badges">
                    {exercise.rutinaEjercicio?.filter((item) => item.rutina.activa).length ? (
                      exercise.rutinaEjercicio
                        .filter((item) => item.rutina.activa)
                        .map((item) => (
                          <span key={item.id} className="routine-tag">
                            {item.rutina.nombre}
                          </span>
                        ))
                    ) : (
                      <small className="muted">No está agregado en ninguna de tus rutinas activas.</small>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      {open && (
        <div className="modal-backdrop" onClick={closeForm}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              if (editing) {
                update.mutate();
              } else {
                create.mutate();
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setOpen(false)}>
              <X />
            </button>
            <span className="eyebrow">BIBLIOTECA PERSONAL</span>
            <h2>{editing ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2>
            <label>
              <span className="label-head">
                Nombre {!name.trim() && <span className="req">*</span>}
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Press Banca Inclinado con Mancuernas"
                required
              />
            </label>
            <label>
              <span className="label-head">
                Descripción {!description.trim() && <span className="req">*</span>}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Describe el movimiento, colocación y rango de movimiento..."
                required
              />
            </label>
            <label>
              <span className="label-head">
                Músculos {muscles.length === 0 && <span className="req">*</span>}
              </span>
              <SelectMenu
                value=""
                placeholder="Añadir músculo (ej. hombro)..."
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
              <span className="label-head">
                Equipo <span className="opt">(opcional)</span>
              </span>
              <SelectMenu
                value=""
                placeholder="Añadir equipo (ej. mancuerna)..."
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
            <label>
              <span className="label-head">
                URL de imagen <span className="opt">(opcional)</span>
              </span>
              <input
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://..."
              />
            </label>
            <label>
              <span className="label-head">
                Link informativo o video <span className="opt">(opcional)</span>
              </span>
              <input
                type="url"
                value={informationLink}
                onChange={(event) => setInformationLink(event.target.value)}
                placeholder="https://youtube.com/..."
              />
            </label>
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
          error={remove.error instanceof Error ? remove.error.message : undefined}
          onClose={() => setArchiveTarget(null)}
          onConfirm={() => remove.mutate(archiveTarget.id)}
        />
      )}
      {deleteTarget && (
        <ConfirmActionModal
          title={`¿Eliminar ${deleteTarget.nombre} definitivamente?`}
          description="Solo se eliminará si ya no pertenece a ninguna rutina ni tiene historial. Esta acción no se puede deshacer."
          confirmLabel="Eliminar definitivamente"
          busy={deleteArchived.isPending}
          error={deleteArchived.error instanceof Error ? deleteArchived.error.message : undefined}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteArchived.mutate(deleteTarget.id)}
        />
      )}
    </Page>
  );
}
