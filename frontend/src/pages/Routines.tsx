import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Card, Empty, Loading, Page } from '../components/Ui';
import { get, post } from '../lib/api';
import type { Routine } from '../lib/types';
export function Routines() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: () => get<Routine[]>('/rutinas'),
  });
  const create = useMutation({
    mutationFn: () => post('/rutinas', { nombre: name, descripcion: description }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routines'] });
      setOpen(false);
      setName('');
      setDescription('');
    },
  });
  if (isLoading) return <Loading />;
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
          <Plus />
          Nueva rutina
        </button>
      }
    >
      <div className="routine-grid">
        {data?.map((r) => (
          <Card key={r.id}>
            <div className="routine-icon">
              <Dumbbell />
            </div>
            <span className="status">{r.activa ? 'ACTIVA' : 'INACTIVA'}</span>
            <h2>{r.nombre}</h2>
            <p>{r.descripcion || 'Sin descripción'}</p>
            <div className="routine-stats">
              <span>
                <b>{r._count?.rutinaEjercicio || 0}</b> ejercicios
              </span>
              <span>
                <b>{r._count?.usuarioRutina || 0}</b> asignaciones
              </span>
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
                rows={4}
              />
            </label>
            {create.error && <div className="error">{create.error.message}</div>}
            <div className="modal-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="button primary">Crear rutina</button>
            </div>
          </form>
        </div>
      )}
    </Page>
  );
}
