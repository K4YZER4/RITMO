import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Flame,
  GripVertical,
  Trophy,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import { useState } from 'react';
import { activeWorkoutSessionId } from '../lib/workoutDraft';
import type { Assignment, Profile, Student } from '../lib/types';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { SelectMenu } from '../components/SelectMenu';

type WeeklyAssignment = Assignment & { idDiaSemana: number };

export function Dashboard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const localActiveSessionId = activeWorkoutSessionId();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneQuery = `?zona_horaria=${encodeURIComponent(timezone)}`;
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
    queryFn: () => get<Assignment[]>(`/entrenamientos/hoy${timezoneQuery}`),
    enabled: !!p && !trainer,
  });
  const { data: week } = useQuery({
    queryKey: ['week'],
    queryFn: () => get<WeeklyAssignment[]>(`/entrenamientos/semana${timezoneQuery}`),
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
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => get<Array<{ fechaSesion: string; idEstado: number }>>('/sesiones'),
    enabled: !!p && !trainer,
  });
  const startWorkout = async () => {
    const activeSessionId = today?.[0]?.sesionEntrenamiento.find(
      (session) => session.idEstado === 1,
    )?.id;
    if (activeSessionId || localActiveSessionId) {
      void nav(`/app/entrenar/${activeSessionId || localActiveSessionId}`);
      return;
    }
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
  const reorder = useMutation({
    mutationFn: (dias: Array<{ id_usuario_rutina: string; numero_dia: number }>) =>
      post(`/entrenamientos/reordenar-semana?zona_horaria=${encodeURIComponent(timezone)}`, {
        dias,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['today'] }),
        qc.invalidateQueries({ queryKey: ['week'] }),
      ]);
      setReorderOpen(false);
    },
  });
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
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const todayAssignment = today?.[0] as WeeklyAssignment | undefined;
  const currentDay = new Date().getDay() || 7;
  const pendingRoutines = week?.filter((item) => item.estadoSemana === 'pendiente') || [];
  const completedDays = new Set(
    (sessions || [])
      .filter((session) => session.idEstado === 2)
      .map((session) => new Date(session.fechaSesion).toLocaleDateString('en-CA')),
  );
  let streak = 0;
  const streakDate = new Date();
  if (!completedDays.has(streakDate.toLocaleDateString('en-CA'))) {
    streakDate.setDate(streakDate.getDate() - 1);
  }
  while (completedDays.has(streakDate.toLocaleDateString('en-CA'))) {
    streak += 1;
    streakDate.setDate(streakDate.getDate() - 1);
  }
  const activeSessionId = today?.[0]?.sesionEntrenamiento.find(
    (session) => session.idEstado === 1,
  )?.id;
  const hasActiveWorkout = Boolean(activeSessionId || localActiveSessionId);
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
          const day = index + 1;
          const assignment =
            week?.find((item) => item.idDiaSemana === day) ??
            (day === currentDay ? todayAssignment : undefined);
          return (
            <div
              className={`week-day ${day === currentDay ? 'today' : ''}`}
              key={name}
              title={assignment?.rutina.nombre || 'Día de descanso'}
            >
              <small>{name}</small>
              <b className={assignment ? 'week-day-routine' : ''}>
                {assignment?.rutina.nombre || 'Descanso'}
              </b>
              {assignment?.estadoSemana === 'pendiente' && (
                <span className="week-day-status pending">Pendiente</span>
              )}
              {day === currentDay && <span className="week-day-today">HOY</span>}
            </div>
          );
        })}
      </div>
      <div className="weekly-planner-actions">
        <button className="button ghost compact" onClick={() => setReorderOpen(true)}>
          Reordenar semana
        </button>
      </div>
      <Card className="today-card student-today">
        <div className="today-icon">
          <CalendarDays size={32} />
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
            {starting
              ? 'Preparando…'
              : hasActiveWorkout
                ? 'Continuar entrenamiento'
                : 'Empezar entrenamiento'}{' '}
            <ArrowRight />
          </button>
        )}
      </Card>
      {!today?.length && <Empty>Tu próximo entrenamiento aparecerá aquí.</Empty>}
      {pendingRoutines.length > 0 && (
        <Card className="pending-routines-card">
          <div className="card-head">
            <div>
              <span className="eyebrow">SEGUIMIENTO</span>
              <h2>Rutinas pendientes</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="pending-count">{pendingRoutines.length}</span>
              <button
                type="button"
                className="button ghost compact"
                onClick={() => setReorderOpen(true)}
              >
                <CalendarDays size={16} /> Reordenar semana
              </button>
            </div>
          </div>
          <p>
            No registraste estas sesiones. Se conservarán pendientes hasta que las completes o
            reprogrames desde <strong>Reordenar semana</strong>.
          </p>
          {pendingRoutines.map((assignment) => (
            <div className="list-row pending-routine-row" key={assignment.id}>
              <div className="pending-routine-main" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div className="pending-routine-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b>{assignment.rutina.nombre}</b>
                  <span className="status pending-status">Pendiente</span>
                </div>
                <small style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={14} />
                  Programada para {formatScheduledDate(assignment.fechaProgramada)}
                </small>
              </div>
            </div>
          ))}
        </Card>
      )}
      <div className="stats">
        <Card>
          <ActivityIcon />
          <b>{streak}</b>
          <span>racha actual</span>
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
      {reorderOpen && (
        <WeeklyReorderModal
          assignments={week || []}
          busy={reorder.isPending}
          error={reorder.error instanceof Error ? reorder.error.message : undefined}
          onClose={() => setReorderOpen(false)}
          onSave={(dias) => reorder.mutate(dias)}
        />
      )}
    </Page>
  );
}

function ActivityIcon() {
  return <Flame />;
}

function WeeklyReorderModal({
  assignments,
  busy,
  error,
  onClose,
  onSave,
}: {
  assignments: WeeklyAssignment[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (dias: Array<{ id_usuario_rutina: string; numero_dia: number }>) => void;
}) {
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const weekDates = getCurrentWeekDates();
  const [slots, setSlots] = useState<Array<WeeklyAssignment | null>>(() =>
    names.map((_, index) => assignments.find((item) => item.idDiaSemana === index + 1) || null),
  );
  const [dragged, setDragged] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const swap = (from: number, to: number) => {
    if (from === to) return;
    setSlots((current) => {
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const move = (target: number) => {
    if (dragged === null || dragged === target) {
      setDragged(null);
      setDragOverIndex(null);
      return;
    }
    swap(dragged, target);
    setDragged(null);
    setDragOverIndex(null);
    setSelected(null);
  };

  const handleSlotClick = (index: number) => {
    if (selected === null) {
      if (slots[index]) {
        setSelected(index);
      }
    } else {
      swap(selected, index);
      setSelected(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal wide reorder-modal" onClick={(event) => event.stopPropagation()}>
        <span className="eyebrow">ESTA SEMANA</span>
        <h2>Reordenar rutinas</h2>
        <p style={{ margin: '4px 0 2px' }}>
          Arrastra y desliza una rutina hacia otro día para moverla o intercambiarla, tal como en el planificador del entrenador.
        </p>
        <small style={{ color: 'var(--muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
          💡 Si tu pantalla es estrecha, puedes deslizar la barra horizontalmente para recorrer todos los días de la semana.
        </small>
        <div className="weekly-reorder-grid-wrapper">
          <div className="weekly-reorder-grid">
            {names.map((name, index) => {
              const isSelected = selected === index;
              const isOver = dragOverIndex === index;
              return (
                <div
                  className={`weekly-reorder-day ${isSelected ? 'selected' : ''} ${isOver ? 'drag-over' : ''}`}
                  key={name}
                  style={{
                    cursor: selected !== null || slots[index] ? 'pointer' : 'default',
                  }}
                  onClick={() => handleSlotClick(index)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDragLeave={() => setDragOverIndex((curr) => (curr === index ? null : curr))}
                  onDrop={() => move(index)}
                >
                  <div className="weekly-reorder-day-heading">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{name}</strong>
                      {isOver && (
                        <span style={{ color: 'var(--lime)', fontWeight: 600, fontSize: '0.72rem' }}>
                          {slots[index] ? '⇄ Intercambiar' : '↓ Mover aquí'}
                        </span>
                      )}
                    </div>
                    <span>{formatScheduledDate(weekDates[index])}</span>
                  </div>
                  {slots[index] ? (
                    <div
                      className={`weekly-reorder-routine ${dragged === index ? 'is-dragging' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setDragged(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragged(null);
                        setDragOverIndex(null);
                      }}
                      title="Arrastra para mover a otro día o intercambiar"
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', width: '100%' }}>
                        <GripVertical className="weekly-reorder-grip" />
                        <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{slots[index]?.rutina.nombre}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="weekly-reorder-empty">
                      {isOver ? <span style={{ color: 'var(--lime)', fontWeight: 600 }}>↓ Soltar aquí</span> : 'Descanso'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {selected !== null && (
          <div style={{ color: 'var(--lime)', fontSize: '0.85rem', marginBottom: '8px' }}>
            ✓ Seleccionado: <strong>{names[selected]}</strong>. Haz clic en otro día para moverlo.
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              onSave(
                slots.filter(Boolean).map((item) => ({
                  id_usuario_rutina: item!.id,
                  numero_dia: slots.indexOf(item) + 1,
                })),
              )
            }
          >
            {busy ? 'Guardando…' : 'Guardar orden'}
          </button>
        </div>
      </section>
    </div>
  );
}

function getCurrentWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  const daysFromMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - daysFromMonday);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatScheduledDate(value?: string | Date) {
  if (!value) return 'Fecha pendiente';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
    }).format(value);
  }
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day));
}
