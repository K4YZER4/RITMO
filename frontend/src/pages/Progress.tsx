import { useQuery } from '@tanstack/react-query';
import { Activity, Trophy, Weight } from 'lucide-react';
import { Card, Loading, Page } from '../components/Ui';
import { get } from '../lib/api';
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
    </Page>
  );
}
