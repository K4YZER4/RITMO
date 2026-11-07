import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Trophy, Weight } from 'lucide-react';
import { Card, Empty, Loading, Page } from '../components/Ui';
import { get, post } from '../lib/api';
import { FormEvent, useState } from 'react';
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
        <h2>Historial de entrenamientos</h2>
        {sessions.data?.map((session) => (
          <div className="list-row" key={session.id}>
            <b>{session.rutina.nombre}</b>
            <small>{new Date(session.fechaSesion).toLocaleDateString('es-MX')}</small>
            <span>{session.idEstado === 2 ? 'Completado' : 'En curso'}</span>
          </div>
        ))}
        {!sessions.data?.length && <Empty>Aún no hay sesiones registradas.</Empty>}
      </Card>
    </Page>
  );
}
