import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Dumbbell, Trophy, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import type { Assignment, Profile, Student } from '../lib/types';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
export function Dashboard() {
  const nav = useNavigate();
  const { data: p, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => get<Profile>('/perfil'),
  });
  const trainer = p?.role === 'entrenador';
  const { data: summary } = useQuery({
    queryKey: ['trainer-summary'],
    queryFn: () =>
      get<{ alumnos: number; rutinas: number; sesionesCompletadas: number }>('/entrenador/resumen'),
    enabled: trainer,
  });
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<Student[]>('/entrenador/alumnos'),
    enabled: trainer,
  });
  const { data: today } = useQuery({
    queryKey: ['today'],
    queryFn: () => get<Assignment[]>('/entrenamientos/hoy'),
    enabled: !!p && !trainer,
  });
  const startWorkout = async () => {
    if (!today?.[0]) return;
    const session = await post<{ id: string }>('/sesiones', {
      usuario_rutina_id: today[0].id,
    });
    await nav(`/app/entrenar/${session.id}`);
  };
  if (isLoading) return <Loading />;
  if (trainer)
    return (
      <Page eyebrow="PANEL DE ENTRENADOR" title={`Hola, ${p?.nombre}`}>
        <div className="stats">
          <Card>
            <Users />
            <b>{summary?.alumnos ?? 0}</b>
            <span>alumnos activos</span>
          </Card>
          <Card>
            <Dumbbell />
            <b>{summary?.rutinas ?? 0}</b>
            <span>rutinas creadas</span>
          </Card>
          <Card>
            <Trophy />
            <b>{summary?.sesionesCompletadas ?? 0}</b>
            <span>sesiones completadas</span>
          </Card>
        </div>
        <div className="split">
          <Card>
            <div className="card-head">
              <h2>Alumnos</h2>
              <Link to="/app/alumnos">
                Ver todos <ArrowRight />
              </Link>
            </div>
            {students?.slice(0, 4).map((s) => (
              <div className="list-row" key={s.idUsuario}>
                <div className="avatar">{s.usuario.nombre[0]}</div>
                <div>
                  <b>{fullName(s.usuario)}</b>
                  <small>{s.objetivo?.nombre || 'Sin objetivo'}</small>
                </div>
                <span>{s.usuario._count.sesionEntrenamiento} sesiones</span>
              </div>
            ))}
          </Card>
          <Card className="accent-card">
            <span className="eyebrow">SIGUIENTE PASO</span>
            <h2>Diseña una nueva rutina</h2>
            <p>Combina ejercicios, define objetivos y asígnala a uno de tus alumnos.</p>
            <Link className="button dark" to="/app/rutinas">
              Abrir constructor <ArrowRight />
            </Link>
          </Card>
        </div>
      </Page>
    );
  return (
    <Page eyebrow="TU ENTRENAMIENTO" title={`Hoy es un buen día, ${p?.nombre}`}>
      <Card className="today-card">
        <CalendarDays />
        <div>
          <span className="eyebrow">PLAN DE HOY</span>
          <h2>{today?.[0]?.rutina.nombre || 'Día de recuperación'}</h2>
          <p>{today?.[0]?.rutina.descripcion || 'No tienes una rutina asignada para hoy.'}</p>
        </div>
        {today?.[0] && (
          <button className="button primary" onClick={() => void startWorkout()}>
            Comenzar <ArrowRight />
          </button>
        )}
      </Card>
      {!today?.length && <Empty>Tu próximo entrenamiento aparecerá aquí.</Empty>}
      <div className="stats">
        <Card>
          <Trophy />
          <b>Tu progreso</b>
          <span>Revisa récords y volumen</span>
          <Link to="/app/progreso">Ver progreso</Link>
        </Card>
      </div>
    </Page>
  );
}
