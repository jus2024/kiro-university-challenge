// Feature: task-habit-tracker
// Property-based and unit tests for the storage layer
// (Tasks 11.2, 11.3, 11.4; Properties 16, 17; Requirements 12.1, 12.2, 13.1, 13.2).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { EMPTY_STATE, type AppState, type Habit, type Task } from '../domain/types';
import { saveState, loadState, isValidAppState } from './storage';

const STORAGE_KEY = 'task-habit-tracker/state';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// --- Generators for a schema-valid AppState ---

const dateKey = fc
  .date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) })
  .map((d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

const arbTask: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  title: fc.string({ maxLength: 60 }),
  dueDate: fc.option(dateKey, { nil: null }),
  tags: fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 8 }),
  status: fc.constantFrom<'open' | 'done'>('open', 'done'),
  completedAt: fc.option(fc.integer({ min: 0, max: 2_000_000_000_000 }), { nil: null }),
  createdAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
});

const arbHabit: fc.Arbitrary<Habit> = fc.record({
  id: fc.uuid(),
  name: fc.string({ maxLength: 60 }),
  targetFrequency: fc.constant<'daily'>('daily'),
  completions: fc.uniqueArray(dateKey, { maxLength: 12 }),
  createdAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
});

const arbState: fc.Arbitrary<AppState> = fc.record({
  version: fc.constant<1>(1),
  tasks: fc.array(arbTask, { maxLength: 8 }),
  habits: fc.array(arbHabit, { maxLength: 8 }),
});

// --- Property 16 ---

describe('save/load roundtrip', () => {
  // Feature: task-habit-tracker, Property 16: Save/load roundtrip preserves application state
  it('Property 16: loadState() after saveState(state) deep-equals the original', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        localStorage.clear();
        const saved = saveState(state);
        expect(saved.ok).toBe(true);
        const loaded = loadState();
        expect(loaded.warning).toBeNull();
        expect(loaded.state).toEqual(state);
      }),
    );
  });
});

// --- Property 17 ---

describe('corrupt-data handling', () => {
  // Feature: task-habit-tracker, Property 17: Corrupt stored data yields empty state with a warning
  it('Property 17: non-JSON or schema-invalid stored strings yield EMPTY_STATE with a non-null warning', () => {
    // Every generated `raw` is guaranteed to be either non-JSON or JSON that is
    // NOT a schema-valid AppState, so loadState() must always substitute
    // EMPTY_STATE and surface a warning. (This deliberately excludes any
    // valid-state string so the expected outcome is unambiguous.)
    const corruptRaw = fc.oneof(
      // Non-JSON text.
      fc.string({ maxLength: 40 }).filter((s) => {
        try {
          JSON.parse(s);
          return false; // parses as JSON -> exclude from the "non-JSON" arm
        } catch {
          return s.trim().length > 0;
        }
      }),
      // Valid JSON of the wrong shape (primitives, arrays, wrong version,
      // wrong field types, or entries that fail per-item schema checks).
      fc.constantFrom(
        '{}',
        'null',
        '42',
        '"a string"',
        '[]',
        '{"version":2,"tasks":[],"habits":[]}',
        '{"version":1,"tasks":{},"habits":[]}',
        '{"version":1,"tasks":[],"habits":{}}',
        '{"version":1,"habits":[]}',
        '{"version":1,"tasks":[]}',
        '{"version":1,"tasks":[{"id":123}],"habits":[]}',
        '{"version":1,"tasks":[{"id":"x","title":"t","dueDate":null,"tags":[1],"status":"open","completedAt":null,"createdAt":0}],"habits":[]}',
        '{"version":1,"tasks":[],"habits":[{"id":"h","name":"n","targetFrequency":"weekly","completions":[],"createdAt":0}]}',
      ),
    );

    fc.assert(
      fc.property(corruptRaw, (raw) => {
        localStorage.clear();
        localStorage.setItem(STORAGE_KEY, raw);
        const result = loadState();
        expect(result.state).toEqual(EMPTY_STATE);
        expect(result.warning).not.toBeNull();
      }),
    );
  });
});

// --- Task 11.4: unit tests for storage failures ---

describe('loadState on hand-crafted corrupt payloads (Task 11.4, R13.2)', () => {
  it('returns EMPTY_STATE + warning for non-JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'this is not json {');
    const result = loadState();
    expect(result.state).toEqual(EMPTY_STATE);
    expect(result.warning).not.toBeNull();
  });

  it('returns EMPTY_STATE + warning for a wrong version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, tasks: [], habits: [] }));
    const result = loadState();
    expect(result.state).toEqual(EMPTY_STATE);
    expect(result.warning).not.toBeNull();
  });

  it('returns EMPTY_STATE + warning for missing fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, tasks: [] }));
    const result = loadState();
    expect(result.state).toEqual(EMPTY_STATE);
    expect(result.warning).not.toBeNull();
  });

  it('returns EMPTY_STATE with NO warning on a clean first run (nothing stored)', () => {
    const result = loadState();
    expect(result.state).toEqual(EMPTY_STATE);
    expect(result.warning).toBeNull();
  });
});

describe('saveState write failure (Task 11.4, R12.2)', () => {
  it('returns { ok:false, warning } without throwing when setItem throws', () => {
    const state: AppState = { version: 1, tasks: [], habits: [] };
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const result = saveState(state);
    expect(result.ok).toBe(false);
    expect(result.warning).not.toBeNull();

    spy.mockRestore();
    // In-memory state is untouched (the caller still holds the same object).
    expect(state).toEqual({ version: 1, tasks: [], habits: [] });
  });
});

// --- Task 1.1 (data-export-import): unit tests for the exported validator ---
// Assert isValidAppState accepts EMPTY_STATE and a populated valid AppState,
// and rejects a wrong version, a malformed task, and a malformed habit
// (Requirements 4.1, 4.2).

describe('isValidAppState (data-export-import Task 1.1, R4.1/R4.2)', () => {
  const validTask: Task = {
    id: 'task-1',
    title: 'Write tests',
    dueDate: '2024-06-03',
    tags: ['work', 'urgent'],
    status: 'done',
    completedAt: 1_700_000_000_000,
    createdAt: 1_699_000_000_000,
  };

  const validHabit: Habit = {
    id: 'habit-1',
    name: 'Exercise',
    targetFrequency: 'daily',
    completions: ['2024-06-01', '2024-06-02'],
    createdAt: 1_699_000_000_000,
  };

  it('accepts EMPTY_STATE', () => {
    expect(isValidAppState(EMPTY_STATE)).toBe(true);
  });

  it('accepts a populated valid AppState', () => {
    const state: AppState = { version: 1, tasks: [validTask], habits: [validHabit] };
    expect(isValidAppState(state)).toBe(true);
  });

  it('rejects a wrong version', () => {
    const state = { version: 2, tasks: [], habits: [] };
    expect(isValidAppState(state)).toBe(false);
  });

  it('rejects a malformed task (missing status)', () => {
    const badTask = {
      id: 'task-1',
      title: 'No status',
      dueDate: null,
      tags: [],
      completedAt: null,
      createdAt: 0,
    };
    const state = { version: 1, tasks: [badTask], habits: [] };
    expect(isValidAppState(state)).toBe(false);
  });

  it('rejects a malformed habit (invalid targetFrequency)', () => {
    const badHabit = {
      id: 'habit-1',
      name: 'Weekly thing',
      targetFrequency: 'weekly',
      completions: [],
      createdAt: 0,
    };
    const state = { version: 1, tasks: [], habits: [badHabit] };
    expect(isValidAppState(state)).toBe(false);
  });
});
