import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWorkoutDraft,
  enqueueWorkoutSet,
  loadWorkoutDraft,
  pendingWorkoutSets,
  removePendingWorkoutSet,
  saveWorkoutValues,
} from './workoutDraft';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('workoutDraft', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    });
  });

  it('persists entered values and pending sets', () => {
    saveWorkoutValues('session-1', { 'set-1': { peso: '80', reps: '8' } });
    enqueueWorkoutSet('session-1', { setId: 'set-1', peso: 80, reps: 8 });

    const draft = loadWorkoutDraft('session-1');
    expect(draft.values['set-1']).toEqual({ peso: '80', reps: '8' });
    expect(pendingWorkoutSets('session-1')).toHaveLength(1);
  });

  it('replaces a pending set and removes it after synchronization', () => {
    enqueueWorkoutSet('session-1', { setId: 'set-1', peso: 80, reps: 8 });
    enqueueWorkoutSet('session-1', { setId: 'set-1', peso: 85, reps: 8 });

    expect(pendingWorkoutSets('session-1')[0].peso).toBe(85);
    removePendingWorkoutSet('session-1', 'set-1');
    expect(pendingWorkoutSets('session-1')).toEqual([]);
  });

  it('clears a session draft', () => {
    enqueueWorkoutSet('session-1', { setId: 'set-1', peso: 80, reps: 8 });
    clearWorkoutDraft('session-1');
    expect(loadWorkoutDraft('session-1').pending).toEqual([]);
  });
});
