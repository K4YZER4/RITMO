import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { del, patch, post } from '../lib/api';
import { Card, Empty } from './Ui';
import { SelectMenu } from './SelectMenu';
import { DateField } from './DateField';
import type { Routine } from '../lib/types';

export type AssignedRoutine = {
  id: string;
  idDiaSemana: number;
  fechaInicio: string;
  fechaFin?: string | null;
  rutina: Routine;
  diaSemana: { nombre: string };
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function WeeklyRoutinePlanner({
  studentId,
  assignments,
  routines,
}: {
  studentId: string;
  assignments: AssignedRoutine[];
  routines: Routine[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AssignedRoutine | null | undefined>(undefined);
  const update = useMutation({
    mutationFn: ({
      assignment,
      routineId,
      day,
      start,
      end,
    }: {
      assignment?: AssignedRoutine;
      routineId: string;
      day: number;
      start: string;
      end: string;
    }) =>
      assignment
        ? patch(`/rutinas/asignaciones/${assignment.id}`, {
            id_rutina: routineId,
            numero_dia: day,
            fecha_inicio: start,
            ...(end ? { fecha_fin: end } : {}),
          })
        : post(`/rutinas/${routineId}/asignaciones`, {
            id_alumno: studentId,
            numero_dia: day,
            fecha_inicio: start,
            ...(end ? { fecha_fin: end } : {}),
          }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student', studentId] });
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: (assignment: AssignedRoutine) => del(`/rutinas/asignaciones/${assignment.id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['student', studentId] });
    },
  });
  return (
    <Card className="weekly-planner-card">
      <div className="card-head">
        <div>
          <span className="eyebrow">PROGRAMACIÓN SEMANAL</span>
          <h2>Rutinas del alumno</h2>
        </div>
        <CalendarDays />
      </div>
      <div className="weekly-planner">
        {DAYS.map((day, index) => {
          const dayAssignments = assignments.filter(
            (assignment) => assignment.idDiaSemana === index + 1,
          );
          return (
            <div
              className={`week-day ${dayAssignments.length > 1 ? 'week-day-warning' : ''}`}
              key={day}
            >
              <div className="week-day-name">
                <strong>{day}</strong>
                <small>
                  {dayAssignments.length
                    ? `${dayAssignments.length} rutina${dayAssignments.length > 1 ? 's' : ''}`
                    : 'Descanso'}
                </small>
              </div>
              <div className="week-day-content">
                {dayAssignments.map((assignment) => (
                  <div className="week-routine" key={assignment.id}>
                    <div>
                      <b>{assignment.rutina.nombre}</b>
                      <small>
                        {assignment.fechaFin
                          ? `Hasta ${new Date(assignment.fechaFin).toLocaleDateString('es-MX')}`
                          : 'Sin fecha final'}
                      </small>
                    </div>
                    <div className="week-routine-actions">
                      <button
                        type="button"
                        title="Cambiar asignación"
                        onClick={() => setEditing(assignment)}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        title="Quitar rutina"
                        onClick={() => {
                          if (window.confirm(`¿Quitar ${assignment.rutina.nombre} del ${day}?`))
                            remove.mutate(assignment);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {!dayAssignments.length && <span className="rest-day">Día de descanso</span>}
                {dayAssignments.length > 1 && (
                  <small className="warning-copy">
                    Hay más de una rutina asignada. Corrige este día.
                  </small>
                )}
                <button type="button" className="week-add" onClick={() => setEditing(null)}>
                  <Plus size={15} /> {dayAssignments.length ? 'Cambiar rutina' : 'Asignar rutina'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!assignments.length && <Empty>Este alumno todavía no tiene rutinas asignadas.</Empty>}
      {editing !== undefined && (
        <AssignmentModal
          assignment={editing}
          routines={routines}
          busy={update.isPending}
          error={update.error instanceof Error ? update.error.message : undefined}
          onClose={() => setEditing(undefined)}
          onSave={(values) => update.mutate({ assignment: editing || undefined, ...values })}
        />
      )}
    </Card>
  );
}

function AssignmentModal({
  assignment,
  routines,
  busy,
  error,
  onClose,
  onSave,
}: {
  assignment: AssignedRoutine | null;
  routines: Routine[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (values: { routineId: string; day: number; start: string; end: string }) => void;
}) {
  const [routineId, setRoutineId] = useState(assignment?.rutina.id || '');
  const [day, setDay] = useState(String(assignment?.idDiaSemana || 1));
  const [start, setStart] = useState(
    assignment?.fechaInicio?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  );
  const [end, setEnd] = useState(assignment?.fechaFin?.slice(0, 10) || '');
  return (
    <div className="modal-backdrop nested-modal" onClick={onClose}>
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ routineId, day: Number(day), start, end });
        }}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <span className="eyebrow">{assignment ? 'EDITAR ASIGNACIÓN' : 'NUEVA ASIGNACIÓN'}</span>
        <h2>{assignment ? 'Cambiar rutina del alumno' : 'Asignar rutina'}</h2>
        <label>
          Rutina
          <SelectMenu
            value={routineId}
            placeholder="Selecciona una rutina"
            options={routines
              .filter((routine) => routine.activa)
              .map((routine) => ({ value: routine.id, label: routine.nombre }))}
            onChange={setRoutineId}
          />
        </label>
        <label>
          Día de la semana
          <SelectMenu
            value={day}
            placeholder="Selecciona un día"
            options={DAYS.map((name, index) => ({ value: String(index + 1), label: name }))}
            onChange={setDay}
          />
        </label>
        <DateField
          label="Fecha de inicio"
          value={start}
          min={new Date().toISOString().slice(0, 10)}
          onChange={setStart}
          required
        />
        <DateField label="Fecha final opcional" value={end} min={start} onChange={setEnd} />
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={!routineId || busy}>
            {busy ? 'Guardando…' : 'Guardar asignación'}
          </button>
        </div>
      </form>
    </div>
  );
}
