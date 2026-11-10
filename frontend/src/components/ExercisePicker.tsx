import { Check, ChevronDown, Dumbbell, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ExerciseLibrary, ExerciseLibraryItem } from '../lib/types';

type ExerciseOption = ExerciseLibraryItem & { kind: 'standard' | 'custom' };

export function ExercisePicker({
  exercises,
  onChange,
}: {
  exercises?: ExerciseLibrary;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'standard' | 'custom'>('all');
  const [muscle, setMuscle] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const options = useMemo<ExerciseOption[]>(
    () => [
      ...(exercises?.estandar || []).map((item) => ({ ...item, kind: 'standard' as const })),
      ...(exercises?.personalizados || []).map((item) => ({ ...item, kind: 'custom' as const })),
    ],
    [exercises],
  );
  const getMuscles = (item: ExerciseOption) =>
    (item.kind === 'standard'
      ? item.ejercicioEstandarMusculo
      : item.ejercicioPersonalizadoMusculo
    )?.map((relation) => relation.musculo) || [];
  const getEquipment = (item: ExerciseOption) =>
    (item.kind === 'standard'
      ? item.ejercicioEstandarEquipo
      : item.ejercicioPersonalizadoEquipo
    )?.map((relation) => relation.equipo) || [];
  const muscles = [
    ...new Map(options.flatMap(getMuscles).map((item) => [item.id, item])).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const equipmentOptions = [
    ...new Map(options.flatMap(getEquipment).map((item) => [item.id, item])).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const filtered = options.filter((item) => {
    const text = `${item.nombre} ${item.descripcion || ''}`.toLowerCase();
    const itemMuscles = getMuscles(item);
    const itemEquipment = getEquipment(item);
    return (
      text.includes(query.toLowerCase()) &&
      (kind === 'all' || item.kind === kind) &&
      (muscle === 'all' || itemMuscles.some((value) => value.id === muscle)) &&
      (equipment === 'all' || itemEquipment.some((value) => value.id === equipment))
    );
  });
  return (
    <div className="exercise-picker">
      <button type="button" className="exercise-picker-trigger" onClick={() => setOpen(!open)}>
        <Dumbbell size={18} />
        <span>{open ? 'Ocultar biblioteca' : 'Explorar biblioteca de ejercicios'}</span>
        <ChevronDown className={open ? 'rotate-icon' : ''} size={18} />
      </button>
      {open && (
        <div className="exercise-picker-panel">
          <div className="exercise-picker-toolbar">
            <div className="exercise-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre..."
                autoFocus
              />
            </div>
            <SlidersHorizontal size={18} />
          </div>
          <div className="exercise-filters">
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="all">Todos los tipos</option>
              <option value="standard">Estándar</option>
              <option value="custom">Personalizados</option>
            </select>
            <select value={muscle} onChange={(event) => setMuscle(event.target.value)}>
              <option value="all">Todos los músculos</option>
              {muscles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
            <select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
              <option value="all">Cualquier equipo</option>
              {equipmentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="exercise-picker-summary">
            <span>{filtered.length} ejercicios encontrados</span>
            {(query || kind !== 'all' || muscle !== 'all' || equipment !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setKind('all');
                  setMuscle('all');
                  setEquipment('all');
                }}
              >
                Limpiar filtros <X size={14} />
              </button>
            )}
          </div>
          <div className="exercise-picker-results">
            {filtered.map((item) => {
              const itemMuscles = getMuscles(item);
              const itemEquipment = getEquipment(item);
              return (
                <button
                  type="button"
                  className="exercise-picker-option"
                  key={`${item.kind}:${item.id}`}
                  onClick={() => {
                    onChange(`${item.kind}:${item.id}`);
                    setOpen(false);
                  }}
                >
                  <span className="exercise-option-icon">
                    <Dumbbell size={18} />
                  </span>
                  <span className="exercise-option-copy">
                    <strong>{item.nombre}</strong>
                    <small>{item.descripcion || 'Sin descripción'}</small>
                    <span className="exercise-tags">
                      <em className={item.kind === 'custom' ? 'custom-tag' : ''}>
                        {item.kind === 'custom' ? 'PERSONALIZADO' : 'ESTÁNDAR'}
                      </em>
                      {itemMuscles.slice(0, 2).map((value) => (
                        <em key={value.id}>{value.nombre}</em>
                      ))}
                      {itemEquipment.slice(0, 1).map((value) => (
                        <em key={value.id}>{value.nombre}</em>
                      ))}
                    </span>
                  </span>
                  <Check size={18} />
                </button>
              );
            })}
            {!filtered.length && (
              <div className="exercise-picker-empty">
                No encontramos ejercicios con esos filtros.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
