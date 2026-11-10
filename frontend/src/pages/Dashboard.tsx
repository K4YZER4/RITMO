import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Dumbbell, Flame, Trophy, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import { useState } from 'react';
import type { Assignment, Profile, Student } from '../lib/types';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
export function Dashboard() {
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);
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
  const { data: week } = useQuery({
    queryKey: ['week'],
    queryFn: () =>
      get<Array<Assignment & { diaSemana?: { nombre: string } }>>('/entrenamientos/semana'),
    enabled: !!p && !trainer,
  });
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () =>
      get<{ sesionesUltimos30Dias: number; volumenUltimos30Dias: number; prs: Array<unknown> }>(
        '/progreso/resumen',
      ),
    enabled: !!p && !trainer,
  });
  const startWorkout = async () => {
    if (!today?.[0]) return;
    setStarting(true);
    try {
      const session = await post<{ id: string }>('/sesiones', {
        usuario_rutina_id: today[0].id,
      });
      void nav(`/app/entrenar/${session.id}`);
    } finally {
      setStarting(false);
    }
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
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const currentDay = new Date().getDay();
  return (
    <Page eyebrow="TU RITMO" title={`Hola, ${p?.nombre} 👋`}>
      <section className="student-hero">
        <div>
          <span className="eyebrow">ESTA SEMANA</span>
          <h2>Pequeños pasos. Gran progreso.</h2>
          <p>Tu entrenamiento de hoy está listo cuando tú lo estés.</p>
        </div>
        <Flame />
      </section>
      <div className="week-strip">
        {dayNames.map((name, index) => {
          const day = index === 0 ? 7 : index;
          const assignment = week?.find(
            (item) =>
              item.id && (item as Assignment & { idDiaSemana?: number }).idDiaSemana === day,
          );
          return (
            <div className={`week-day ${day === currentDay ? 'today' : ''}`} key={name}>
              <small>{name}</small>
              <b>{day === currentDay ? 'HOY' : assignment ? '•' : '—'}</b>
            </div>
          );
        })}
      </div>
      <Card className="today-card student-today">
        <div className="today-icon">
          <CalendarDays />
        </div>
        <div>
          <span className="eyebrow">ENTRENAMIENTO DE HOY</span>
          <h2>{today?.[0]?.rutina.nombre || 'Día de recuperación'}</h2>
          <p>{today?.[0]?.rutina.descripcion || 'No tienes una rutina asignada para hoy.'}</p>
        </div>
        {today?.[0] && (
          <button
            className="button primary"
            disabled={starting}
            onClick={() => void startWorkout()}
          >
            {starting ? 'Preparando…' : 'Empezar entrenamiento'} <ArrowRight />
          </button>
        )}
      </Card>
      {!today?.length && <Empty>Tu próximo entrenamiento aparecerá aquí.</Empty>}
      <div className="stats">
        <Card>
          <ActivityIcon />
          <b>{progress?.sesionesUltimos30Dias ?? 0}</b>
          <span>sesiones este mes</span>
        </Card>
        <Card>
          <Dumbbell />
          <b>{Math.round(progress?.volumenUltimos30Dias ?? 0).toLocaleString()}</b>
          <span>kg de volumen</span>
        </Card>
        <Card>
          <Trophy />
          <b>{progress?.prs?.length ?? 0}</b>
          <span>récords personales</span>
        </Card>
      </div>
      <Card className="student-cta">
        <div>
          <span className="eyebrow">ÚLTIMOS AVANCES</span>
          <h2>Tu progreso se construye sesión a sesión.</h2>
        </div>
        <Link className="button ghost" to="/app/progreso">
          Ver progreso <ArrowRight />
        </Link>
      </Card>
    </Page>
  );
}

function ActivityIcon() {
  return <Flame />;
}
