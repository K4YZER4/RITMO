import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Trophy, Weight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, Empty, Loading, Page, fullName } from '../components/Ui';
import { get } from '../lib/api';
import type { ExerciseLibrary } from '../lib/types';
import { RoutineExerciseEditor } from '../components/RoutineExerciseEditor';
import type { Routine } from '../lib/types';

type StudentDetailData = {
  usuario: {
    nombre: string;
    apellidoPaterno: string;
    correo: string;
    usuarioMedicion: Array<{
      id: string;
      fechaMedicion: string;
      pesoKg?: string;
      grasaCorporalPct?: string;
    }>;
    usuarioRutina: Array<{
      id: string;
      rutina: Routine;
      diaSemana: { nombre: string };
    }>;
    sesionEntrenamiento: Array<{
      id: string;
      fechaSesion: string;
      idEstado: number;
      rutina: { nombre: string };
    }>;
    alumnoEjercicioPr: Array<{
      id: string;
      peso: string;
      repeticiones: number;
      ejercicioEstandar?: { nombre: string };
      ejercicioPersonalizado?: { nombre: string };
    }>;
  };
  objetivo?: { nombre: string };
};

export function StudentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  useEffect(() => {
    void qc.prefetchQuery({
      queryKey: ['exercises'],
      queryFn: () => get<ExerciseLibrary>('/ejercicios'),
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => get<StudentDetailData>(`/entrenador/alumnos/${id}`),
    enabled: Boolean(id),
  });
  const progress = useQuery({
    queryKey: ['student-progress', id],
    queryFn: () =>
      get<{ sesionesUltimos30Dias: number; volumenUltimos30Dias: number }>(
        `/entrenador/alumnos/${id}/progreso`,
      ),
    enabled: Boolean(id),
  });
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  if (isLoading) return <Loading />;
  if (isError || !data) return <Empty>No se pudo cargar el detalle del alumno.</Empty>;
  const latest = data.usuario.usuarioMedicion[0];
  return (
    <Page
      eyebrow="SEGUIMIENTO"
      title={fullName(data.usuario)}
      action={
        <Link className="button ghost" to="/app/alumnos">
          <ArrowLeft /> Volver
        </Link>
      }
    >
      <p>
        {data.usuario.correo} · Objetivo: {data.objetivo?.nombre || 'No definido'}
      </p>
      {progress.isError && (
        <div className="error">No se pudo cargar el resumen de progreso de este alumno.</div>
      )}
      <div className="stats">
        <Card>
          <Weight />
          <b>{latest?.pesoKg || '—'} kg</b>
          <span>última medición</span>
        </Card>
        <Card>
          <CalendarDays />
          <b>{progress.data?.sesionesUltimos30Dias ?? data.usuario.sesionEntrenamiento.length}</b>
          <span>sesiones en 30 días</span>
        </Card>
        <Card>
          <Trophy />
          <b>{Math.round(progress.data?.volumenUltimos30Dias ?? 0).toLocaleString()} kg</b>
          <span>volumen en 30 días</span>
        </Card>
      </div>
      <div className="split">
        <Card>
          <h2>Rutinas activas</h2>
          {data.usuario.usuarioRutina.map((assignment) => (
            <div className="list-row" key={assignment.id}>
              <div>
                <b>{assignment.rutina.nombre}</b>
                <small>{assignment.diaSemana.nombre}</small>
              </div>
              <button
                className="button ghost compact"
                onClick={() => setEditingRoutine(assignment.rutina)}
              >
                Editar rutina
              </button>
            </div>
          ))}
          {!data.usuario.usuarioRutina.length && <Empty>Sin rutinas activas.</Empty>}
        </Card>
        <Card>
          <h2>Récords personales</h2>
          {data.usuario.alumnoEjercicioPr.map((pr) => (
            <div className="list-row" key={pr.id}>
              <div>
                <b>{pr.ejercicioEstandar?.nombre || pr.ejercicioPersonalizado?.nombre}</b>
                <small>{pr.repeticiones} repeticiones</small>
              </div>
              <strong>{pr.peso} kg</strong>
            </div>
          ))}
          {!data.usuario.alumnoEjercicioPr.length && <Empty>Sin récords todavía.</Empty>}
        </Card>
      </div>
      <Card>
        <h2>Sesiones recientes</h2>
        {data.usuario.sesionEntrenamiento.map((session) => (
          <div className="list-row" key={session.id}>
            <b>{session.rutina.nombre}</b>
            <small>{new Date(session.fechaSesion).toLocaleDateString('es-MX')}</small>
            <span>{session.idEstado === 2 ? 'Completada' : 'En curso'}</span>
          </div>
        ))}
        {!data.usuario.sesionEntrenamiento.length && (
          <Empty>El alumno todavía no tiene sesiones.</Empty>
        )}
      </Card>
      {editingRoutine && (
        <RoutineExerciseEditor
          routine={editingRoutine}
          onClose={() => setEditingRoutine(null)}
          onSaved={() => setEditingRoutine(null)}
        />
      )}
    </Page>
  );
}
