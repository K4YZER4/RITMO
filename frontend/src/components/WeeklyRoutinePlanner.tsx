import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Edit3, GripVertical, Info, Plus, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';
import { del, patch, post } from '../lib/api';
import { Card, Empty } from './Ui';
import { SelectMenu } from './SelectMenu';
import { DateField } from './DateField';
import { ConfirmActionModal } from './ConfirmActionModal';
import type { Routine } from '../lib/types';

export type AssignedRoutine = {
  id: string;
  idDiaSemana: number;
  fechaInicio: string;
  fechaFin?: string | null;
  motivoCambio?: string | null;
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
  const [editing, setEditing] = useState<{
    assignment?: AssignedRoutine | null;
    dayNumber: number;
  } | null>(null);
  const [removing, setRemoving] = useState<{
    assignment: AssignedRoutine;
    day: string;
  } | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<AssignedRoutine | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const reorder = useMutation({
    mutationFn: (cambios: Array<{ id_usuario_rutina: string; numero_dia: number }>) =>
      patch<{ success: boolean; message: string }>('/rutinas/asignaciones/reordenar', {
        cambios,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['student', studentId] }),
        qc.invalidateQueries({ queryKey: ['routine-planner-student', studentId] }),
      ]);
    },
  });

  const handleDragStart = (assignment: AssignedRoutine, e: React.DragEvent) => {
    setDraggedAssignment(assignment);
    e.dataTransfer.setData('text/plain', assignment.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== dayNumber) {
      setDragOverDay(dayNumber);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDayNumber: number) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!draggedAssignment) return;
    if (draggedAssignment.idDiaSemana === targetDayNumber) {
      setDraggedAssignment(null);
      return;
    }

    const targetAssignment = assignments.find((a) => a.idDiaSemana === targetDayNumber);
    if (targetAssignment) {
      reorder.mutate([
        { id_usuario_rutina: draggedAssignment.id, numero_dia: targetDayNumber },
        { id_usuario_rutina: targetAssignment.id, numero_dia: draggedAssignment.idDiaSemana },
      ]);
    } else {
      reorder.mutate([
        { id_usuario_rutina: draggedAssignment.id, numero_dia: targetDayNumber },
      ]);
    }
    setDraggedAssignment(null);
  };

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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['student', studentId] }),
        qc.invalidateQueries({ queryKey: ['routine-planner-student', studentId] }),
      ]);
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (assignment: AssignedRoutine) => del(`/rutinas/asignaciones/${assignment.id}`),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['student', studentId] }),
        qc.invalidateQueries({ queryKey: ['routine-planner-student', studentId] }),
      ]);
      setRemoving(null);
    },
  });
  const hasStudentReorder = assignments.some(
    (a) =>
      a.motivoCambio?.startsWith('Reprogramada semana') ||
      a.motivoCambio?.startsWith('Reprogramada origen semana'),
  );

  return (
    <Card className="weekly-planner-card">
      <div className="card-head">
        <div>
          <span className="eyebrow">PROGRAMACIÓN SEMANAL</span>
          <h2>Rutinas del alumno</h2>
          <small style={{ color: 'var(--muted)', display: 'block', marginTop: '2px', fontSize: '0.8rem' }}>
            💡 Arrastra y desliza las rutinas entre los días para moverlas o intercambiarlas.
          </small>
        </div>
        <CalendarDays />
      </div>
      {reorder.error && (
        <div className="error" style={{ margin: '8px 0' }}>
          {reorder.error instanceof Error ? reorder.error.message : 'Error al reordenar las rutinas'}
        </div>
      )}
      {hasStudentReorder && (
        <div className="planner-reorder-banner">
          <Info size={16} />
          <span>
            <strong>El alumno hizo un reorden esta semana:</strong> Arriba se conserva la programación habitual (base) y abajo se muestra la rutina que el alumno reordenó para esta semana.
          </span>
        </div>
      )}
      <div className="weekly-planner">
        {DAYS.map((day, index) => {
          const dayNumber = index + 1;
          const dayAssignments = assignments.filter(
            (assignment) => assignment.idDiaSemana === dayNumber,
          );
          const baseAssignments = dayAssignments.filter(
            (a) => !a.motivoCambio?.startsWith('Reprogramada semana'),
          );
          const studentOverrides = dayAssignments.filter(
            (a) => a.motivoCambio?.startsWith('Reprogramada semana'),
          );
          const hasRealConflict = baseAssignments.length > 1;
          const isOver = dragOverDay === dayNumber;

          const dayLabel = isOver
            ? dayAssignments.length
              ? '⇄ Intercambiar'
              : '↓ Mover aquí'
            : baseAssignments.length && studentOverrides.length
            ? 'Base + Reorden'
            : studentOverrides.length
            ? 'Reorden alumno'
            : baseAssignments.length
            ? `${baseAssignments.length} rutina${baseAssignments.length > 1 ? 's' : ''}`
            : 'Descanso';

          return (
            <div
              className={`week-day ${hasRealConflict ? 'week-day-warning' : ''} ${
                isOver ? 'drag-over' : ''
              }`}
              key={day}
              onDragOver={(e) => handleDragOver(e, dayNumber)}
              onDragLeave={() => setDragOverDay((curr) => (curr === dayNumber ? null : curr))}
              onDrop={(e) => handleDrop(e, dayNumber)}
            >
              <div className="week-day-name">
                <strong>{day}</strong>
                <small>{dayLabel}</small>
              </div>
              <div className="week-day-content">
                {/* 1. Rutina habitual / base (Arriba) */}
                {baseAssignments.map((assignment) => {
                  const isThisDragging = draggedAssignment?.id === assignment.id;
                  const isMovedByStudent = assignment.motivoCambio?.startsWith('Reprogramada origen semana');
                  return (
                    <div
                      className={`week-routine ${isThisDragging ? 'is-dragging' : ''}`}
                      key={assignment.id}
                      draggable={!reorder.isPending}
                      onDragStart={(e) => handleDragStart(assignment, e)}
                      onDragEnd={() => {
                        setDraggedAssignment(null);
                        setDragOverDay(null);
                      }}
                      title="Arrastra para mover a otro día o intercambiar"
                    >
                      <div className="week-routine-header">
                        <GripVertical size={14} className="week-routine-grip" />
                        <div>
                          <b>{assignment.rutina.nombre}</b>
                          <small>
                            {assignment.fechaFin
                              ? `Hasta ${new Date(assignment.fechaFin).toLocaleDateString('es-MX')}`
                              : 'Programación habitual'}
                          </small>
                          {isMovedByStudent && (
                            <span className="week-routine-moved-tag">
                              Movida por el alumno esta semana
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="week-routine-actions">
                        <button
                          type="button"
                          title="Cambiar asignación habitual"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing({ assignment, dayNumber });
                          }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          title="Quitar rutina habitual"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemoving({ assignment, day });
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Rutina reordenada por el alumno (Abajo) */}
                {studentOverrides.map((override) => (
                  <div
                    className="week-routine week-routine-student-override"
                    key={override.id}
                    title="Ajuste temporal realizado por el alumno para esta semana"
                  >
                    <div className="week-routine-student-tag">
                      <User size={12} />
                      <span>El alumno hizo un reorden de esta semana:</span>
                    </div>
                    <div className="week-routine-header">
                      <div>
                        <b>{override.rutina.nombre}</b>
                        <small>
                          {override.fechaFin
                            ? `Activa hasta ${new Date(override.fechaFin).toLocaleDateString('es-MX')}`
                            : 'Solo esta semana'}
                        </small>
                      </div>
                    </div>
                  </div>
                ))}

                {!baseAssignments.length && !studentOverrides.length && (
                  <span className="rest-day">
                    {isOver ? 'Suelta para asignar aquí' : 'Día de descanso'}
                  </span>
                )}
                {hasRealConflict && (
                  <small className="warning-copy">
                    Hay más de una rutina habitual asignada. Corrige este día.
                  </small>
                )}
                <button
                  type="button"
                  className="week-add"
                  onClick={() => setEditing({ assignment: baseAssignments[0] || null, dayNumber })}
                >
                  <Plus size={15} /> {baseAssignments.length ? 'Cambiar rutina' : 'Asignar rutina'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!assignments.length && <Empty>Este alumno todavía no tiene rutinas asignadas.</Empty>}
      {editing && (
        <AssignmentModal
          dayNumber={editing.dayNumber}
          assignment={editing.assignment || null}
          routines={routines}
          busy={update.isPending}
          error={update.error instanceof Error ? update.error.message : undefined}
          onClose={() => setEditing(null)}
          onSave={(values) =>
            update.mutate({
              assignment: editing.assignment || undefined,
              ...values,
            })
          }
        />
      )}
      {removing && (
        <ConfirmActionModal
          title="¿Quitar esta rutina?"
          description={`Se quitará “${removing.assignment.rutina.nombre}” del ${removing.day} para este alumno. Sus sesiones e historial se conservarán.`}
          confirmLabel="Quitar rutina"
          busy={remove.isPending}
          error={remove.error instanceof Error ? remove.error.message : undefined}
          onClose={() => {
            if (!remove.isPending) setRemoving(null);
          }}
          onConfirm={() => remove.mutate(removing.assignment)}
        />
      )}
    </Card>
  );
}

function getLocalTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function AssignmentModal({
  dayNumber,
  assignment,
  routines,
  busy,
  error,
  onClose,
  onSave,
}: {
  dayNumber: number;
  assignment: AssignedRoutine | null;
  routines: Routine[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (values: { routineId: string; day: number; start: string; end: string }) => void;
}) {
  const localToday = getLocalTodayDateString();
  const [routineId, setRoutineId] = useState(assignment?.rutina.id || '');
  const [start, setStart] = useState(
    assignment?.fechaInicio?.slice(0, 10) || localToday,
  );
  const [end, setEnd] = useState(assignment?.fechaFin?.slice(0, 10) || '');
  const dayName = DAYS[dayNumber - 1];

  return (
    <div className="modal-backdrop nested-modal" onClick={onClose}>
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ routineId, day: dayNumber, start, end });
        }}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          <X />
        </button>
        <span className="eyebrow">
          {assignment ? 'MODIFICAR RUTINA' : 'NUEVA ASIGNACIÓN'} · {dayName.toUpperCase()}
        </span>
        <h2>{assignment ? `Modificar rutina del ${dayName}` : `Asignar rutina para el ${dayName}`}</h2>
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
        <DateField
          label="Fecha de inicio"
          value={start}
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
