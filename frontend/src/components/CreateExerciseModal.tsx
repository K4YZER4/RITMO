import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import { get, post } from '../lib/api';
import { SelectMenu } from './SelectMenu';
import type { Catalogs } from '../lib/types';

export function CreateExerciseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [informationLink, setInformationLink] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const catalogs = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => get<Catalogs>('/catalogos'),
    staleTime: 10 * 60 * 1000,
  });
  const create = useMutation({
    mutationFn: () =>
      post('/ejerciciosPersonalizados', {
        nombre: name,
        descripcion: description,
        ...(image ? { url_imagen: image } : {}),
        ...(informationLink ? { link_informacion: informationLink } : {}),
        musculos: muscles.map(Number),
        equipos: equipment.map(Number),
      }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['exercises'] });
      onClose();
    },
  });
  return (
    <div className="modal-backdrop nested-modal" onClick={onClose}>
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <span className="eyebrow">BIBLIOTECA PERSONAL</span>
        <h2>Crear ejercicio</h2>
        <label>
          Nombre <span className="req">*</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Press Banca Inclinado con Mancuernas"
            required
          />
        </label>
        <label>
          Descripción <span className="req">*</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Describe el movimiento y recomendaciones técnicas..."
            required
          />
        </label>
        <label>
          Músculos <span className="req">*</span>
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
          Equipo <span className="opt">(opcional)</span>
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
          URL de imagen <span className="opt">(opcional)</span>
          <input
            type="url"
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label>
          Link informativo o video <span className="opt">(opcional)</span>
          <input
            type="url"
            value={informationLink}
            onChange={(event) => setInformationLink(event.target.value)}
            placeholder="https://youtube.com/..."
          />
        </label>
        {create.error && <div className="error">{create.error.message}</div>}
        <button className="button primary full" disabled={!muscles.length || create.isPending}>
          {create.isPending ? 'Creando…' : 'Crear ejercicio'}
        </button>
      </form>
    </div>
  );
}
