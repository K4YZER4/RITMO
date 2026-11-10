import { isRetryableApiError, patch } from './api';

export type WorkoutValue = { peso: string; reps: string };
export type PendingSet = { setId: string; peso: number; reps: number; updatedAt: number };
export type WorkoutDraft = {
  sessionId: string;
  updatedAt: number;
  values: Record<string, WorkoutValue>;
  pending: PendingSet[];
};

const prefix = 'ritmo:workout:';
const activeKey = 'ritmo:workout:active';

function key(sessionId: string) {
  return `${prefix}${sessionId}`;
}

function read(sessionId: string): WorkoutDraft {
  try {
    const raw = localStorage.getItem(key(sessionId));
    if (raw) {
      const draft = JSON.parse(raw) as WorkoutDraft;
      if (draft.sessionId === sessionId && Date.now() - draft.updatedAt < 24 * 60 * 60 * 1000) {
        return draft;
      }
    }
  } catch {
    // A corrupt local draft should never prevent opening a workout.
  }
  return { sessionId, updatedAt: Date.now(), values: {}, pending: [] };
}

function write(draft: WorkoutDraft) {
  try {
    localStorage.setItem(key(draft.sessionId), JSON.stringify(draft));
    localStorage.setItem(activeKey, draft.sessionId);
  } catch {
    // Storage can be unavailable in private browsing; the server remains the source of truth.
  }
}

export function loadWorkoutDraft(sessionId: string) {
  const draft = read(sessionId);
  write(draft);
  return draft;
}

export function saveWorkoutValues(sessionId: string, values: Record<string, WorkoutValue>) {
  const draft = read(sessionId);
  write({ ...draft, values, updatedAt: Date.now() });
}

export function enqueueWorkoutSet(sessionId: string, set: Omit<PendingSet, 'updatedAt'>) {
  const draft = read(sessionId);
  const pending = draft.pending.filter((item) => item.setId !== set.setId);
  write({
    ...draft,
    pending: [...pending, { ...set, updatedAt: Date.now() }],
    updatedAt: Date.now(),
  });
}

export function pendingWorkoutSets(sessionId: string) {
  return read(sessionId).pending;
}

export function removePendingWorkoutSet(sessionId: string, setId: string) {
  const draft = read(sessionId);
  write({
    ...draft,
    pending: draft.pending.filter((item) => item.setId !== setId),
    updatedAt: Date.now(),
  });
}

export function clearWorkoutDraft(sessionId: string) {
  try {
    localStorage.removeItem(key(sessionId));
    if (localStorage.getItem(activeKey) === sessionId) localStorage.removeItem(activeKey);
  } catch {
    // Ignore unavailable storage.
  }
}

export function activeWorkoutSessionId() {
  try {
    return localStorage.getItem(activeKey);
  } catch {
    return null;
  }
}

export function clearWorkoutDrafts() {
  try {
    const keys = Object.keys(localStorage).filter((item) => item.startsWith(prefix));
    keys.forEach((item) => localStorage.removeItem(item));
  } catch {
    // Ignore unavailable storage.
  }
}

export async function syncWorkoutDraft(sessionId: string) {
  const pending = pendingWorkoutSets(sessionId);
  const failed: PendingSet[] = [];
  const permanent: PendingSet[] = [];
  for (const item of pending) {
    try {
      await patch(`/sesiones/${sessionId}/sets/${item.setId}`, {
        peso: item.peso,
        repeticiones: item.reps,
        completado: true,
      });
      removePendingWorkoutSet(sessionId, item.setId);
    } catch (error) {
      if (isRetryableApiError(error)) failed.push(item);
      else {
        permanent.push(item);
        removePendingWorkoutSet(sessionId, item.setId);
      }
    }
  }
  return { sent: pending.length - failed.length - permanent.length, failed, permanent };
}
