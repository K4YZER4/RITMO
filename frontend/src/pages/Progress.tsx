import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Trophy, Weight } from 'lucide-react';
import { Plus, X } from 'lucide-react';
import { Card, Empty, Loading, Page } from '../components/Ui';
import { get, post } from '../lib/api';
import { FormEvent, useState } from 'react';
import { SelectMenu } from '../components/SelectMenu';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Catalogs } from '../lib/types';
type ProgressData = {
  sesionesUltimos30Dias: number;
  volumenUltimos30Dias: number;
  prs: Array<{
    id: string;
    peso: string;
    repeticiones: number;
    ejercicioEstandar?: { nombre: string };
    ejercicioPersonalizado?: { nombre: string };
  }>;
  ultimaMedicion?: { pesoKg: string; grasaCorporalPct: string };
};
export function Progress() {
  const qc = useQueryClient();
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');
  const [muscles, setMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: () => get<Catalogs>('/catalogos') });
  const measurements = useQuery({
    queryKey: ['measurements'],
    queryFn: () =>
      get<Array<{ id: string; fechaMedicion: string; pesoKg?: string; grasaCorporalPct?: string }>>(
        '/mediciones',
      ),
  });
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () =>
      get<Array<{ id: string; fechaSesion: string; idEstado: number; rutina: { nombre: string } }>>(
        '/sesiones',
      ),
  });
  const saveMeasurement = useMutation({
    mutationFn: () =>
      post('/mediciones', {
        fecha_medicion: new Date().toISOString().slice(0, 10),
        peso_kg: Number(weight),
        ...(bodyFat ? { grasa_corporal_pct: Number(bodyFat) } : {}),
      }),
    onSuccess: () => {
      setWeight('');
      setBodyFat('');
      void qc.invalidateQueries({ queryKey: ['measurements'] });
      void qc.invalidateQueries({ queryKey: ['progress'] });
    },
  });
  const saveExercise = useMutation({
    mutationFn: () =>
      post('/ejerciciosPersonalizados', {
        nombre: exerciseName,
        descripcion: exerciseDescription,
        musculos: muscles.map(Number),
        equipos: equipment.map(Number),
      }),
    onSuccess: () => {
      setExerciseOpen(false);
      setExerciseName('');
      setExerciseDescription('');
      setMuscles([]);
      setEquipment([]);
      void qc.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: () => get<ProgressData>('/progreso/resumen'),
  });
  if (isLoading) return <Loading />;
  return (
    <Page eyebrow="RESULTADOS" title="Tu progreso">
      <div className="stats">
        <Card>
          <Activity />
          <b>{data?.sesionesUltimos30Dias || 0}</b>
          <span>sesiones en 30 días</span>
        </Card>
        <Card>
          <Weight />
          <b>{Math.round(data?.volumenUltimos30Dias || 0).toLocaleString()}</b>
          <span>kg de volumen</span>
        </Card>
        <Card>
          <Trophy />
          <b>{data?.prs.length || 0}</b>
          <span>récords personales</span>
        </Card>
      </div>
      <Card className="chart-card">
        <h2>Evolución de peso</h2>
        <div className="chart">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={[...(measurements.data || [])].reverse()}>
              <XAxis
                dataKey="fechaMedicion"
                tickFormatter={(value: string | number) =>
                  new Date(value).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
                }
              />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="pesoKg"
                stroke="#b7f34a"
                strokeWidth={3}
                dot={{ fill: '#b7f34a', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="split">
        <Card>
          <h2>Récords recientes</h2>
          {data?.prs.map((pr) => (
            <div className="list-row" key={pr.id}>
              <div className="trophy">
                <Trophy />
              </div>
              <div>
                <b>{pr.ejercicioEstandar?.nombre || pr.ejercicioPersonalizado?.nombre}</b>
                <small>{pr.repeticiones} repeticiones</small>
              </div>
              <strong>{pr.peso} kg</strong>
            </div>
          ))}
        </Card>
        <Card className="accent-card">
          <span className="eyebrow">ÚLTIMA MEDICIÓN</span>
          <h2>{data?.ultimaMedicion?.pesoKg || '—'} kg</h2>
          <p>Grasa corporal: {data?.ultimaMedicion?.grasaCorporalPct || '—'}%</p>
        </Card>
      </div>
      <div className="split">
        <Card>
          <h2>Registrar medición</h2>
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              saveMeasurement.mutate();
            }}
          >
            <label>
              Peso (kg)
              <input
                type="number"
                min="20"
                max="500"
                step="0.01"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </label>
            <label>
              Grasa corporal (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={bodyFat}
                onChange={(event) => setBodyFat(event.target.value)}
              />
            </label>
            {saveMeasurement.error && <div className="error">{saveMeasurement.error.message}</div>}
            <button className="button primary" disabled={saveMeasurement.isPending}>
              Guardar medición
            </button>
          </form>
        </Card>
        <Card>
          <h2>Historial de mediciones</h2>
          {measurements.data?.slice(0, 6).map((measurement) => (
            <div className="list-row" key={measurement.id}>
              <b>{measurement.pesoKg || '—'} kg</b>
              <small>{new Date(measurement.fechaMedicion).toLocaleDateString('es-MX')}</small>
              <span>
                {measurement.grasaCorporalPct ? `${measurement.grasaCorporalPct}% grasa` : ''}
              </span>
            </div>
          ))}
          {!measurements.data?.length && <Empty>Registra tu primera medición.</Empty>}
        </Card>
      </div>
      <Card>
        <div className="card-head">
          <h2>Historial de entrenamientos</h2>
          <button className="button primary" onClick={() => setExerciseOpen(true)}>
            <Plus /> Crear ejercicio
          </button>
        </div>
        {sessions.data?.map((session) => (
          <div className="list-row" key={session.id}>
            <b>{session.rutina.nombre}</b>
            <small>{new Date(session.fechaSesion).toLocaleDateString('es-MX')}</small>
            <span>{session.idEstado === 2 ? 'Completado' : 'En curso'}</span>
          </div>
        ))}
        {!sessions.data?.length && <Empty>Aún no hay sesiones registradas.</Empty>}
      </Card>
      {exerciseOpen && (
        <div className="modal-backdrop" onClick={() => setExerciseOpen(false)}>
          <form
            className="modal"
            onSubmit={(event) => {
              event.preventDefault();
              saveExercise.mutate();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setExerciseOpen(false)}>
              <X />
            </button>
            <span className="eyebrow">BIBLIOTECA PERSONAL</span>
            <h2>Nuevo ejercicio</h2>
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
              Músculos
              <SelectMenu
                value=""
                placeholder="Añadir músculo"
                options={(catalogs.data?.musculos || [])
                  .filter((item) => !muscles.includes(item.id))
                  .map((item) => ({ value: item.id, label: item.nombre }))}
                onChange={(value) => setMuscles([...muscles, value])}
              />
            </label>
            <div className="chips">
              {muscles.map((id) => (
                <button
                  type="button"
                  key={id}
                  className="chip"
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
                onChange={(value) => setEquipment([...equipment, value])}
              />
            </label>
            <div className="chips">
              {equipment.map((id) => (
                <button
                  type="button"
                  key={id}
                  className="chip"
                  onClick={() => setEquipment(equipment.filter((item) => item !== id))}
                >
                  {catalogs.data?.equipos.find((item) => item.id === id)?.nombre} <X size={14} />
                </button>
              ))}
            </div>
            {saveExercise.error && <div className="error">{saveExercise.error.message}</div>}
            <button
              className="button primary full"
              disabled={!muscles.length || saveExercise.isPending}
            >
              Guardar ejercicio
            </button>
          </form>
        </div>
      )}
    </Page>
  );
}
