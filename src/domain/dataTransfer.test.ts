// Feature: data-export-import
// Property-based tests for the pure data-transfer domain module
// (Tasks 2.2–2.6; Properties 1–5; Requirements 1.1, 1.3, 2.1, 2.3, 4.1, 4.2, 4.3, 4.4).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { EMPTY_STATE, type AppState, type DateKey, type Habit, type Task } from './types';
import {
  serializeState,
  parseImport,
  exportFileName,
  EXPORT_FILENAME_PREFIX,
} from './dataTransfer';
import { isValidAppState } from '../storage/storage';

// --- Generators for a schema-valid AppState (adapted from storage.test.ts) ---

const dateKey: fc.Arbitrary<DateKey> = fc
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

// Arbitrary JSON-serializable values (objects, arrays, primitives, nested).
const arbJsonValue: fc.Arbitrary<unknown> = fc.jsonValue();

// --- Property 1 (Task 2.2) ---

describe('Property 1: export/import round-trip', () => {
  // Feature: data-export-import, Property 1: Export/import round-trip preserves application state
  it('parseImport(serializeState(state)) returns { ok:true, state } deep-equal to the original', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const result = parseImport(serializeState(state));
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.state).toEqual(state);
          expect(result.state.version).toBe(state.version);
          expect(result.state.tasks).toEqual(state.tasks);
          expect(result.state.habits).toEqual(state.habits);
        }
      }),
    );
  });
});

// --- Property 2 (Task 2.3) ---

describe('Property 2: non-JSON input rejection', () => {
  // Feature: data-export-import, Property 2: Non-JSON input is rejected with no state
  it('parseImport of any non-JSON string returns { ok:false } with a non-empty error and no state', () => {
    // Constrain the input space to strings that FAIL JSON.parse, so the expected
    // outcome (ok:false) is unambiguous regardless of what the string contains.
    const nonJson = fc.string({ maxLength: 60 }).filter((s) => {
      try {
        JSON.parse(s);
        return false; // parses as JSON -> exclude
      } catch {
        return true;
      }
    });

    fc.assert(
      fc.property(nonJson, (text) => {
        const result = parseImport(text);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
        expect('state' in result).toBe(false);
      }),
    );
  });
});

// --- Property 3 (Task 2.4) ---

describe('Property 3: schema/version-invalid JSON rejection', () => {
  // Feature: data-export-import, Property 3: Schema- or version-invalid JSON is rejected
  it('parseImport of any JSON value that is not a schema-valid AppState returns ok:false, never ok:true', () => {
    // Generate arbitrary JSON values and keep only those the shared validator
    // rejects; parseImport must never accept any of them.
    const invalidJson = arbJsonValue.filter((v) => !isValidAppState(v));

    fc.assert(
      fc.property(invalidJson, (value) => {
        const result = parseImport(JSON.stringify(value));
        expect(result.ok).toBe(false);
      }),
    );
  });
});

// --- Property 4 (Task 2.5) ---

describe('Property 4: export filename format', () => {
  // Feature: data-export-import, Property 4: Export filename has the fixed prefix, the date, and the .json extension
  it('exportFileName(day) starts with the prefix, contains day, and ends with .json', () => {
    fc.assert(
      fc.property(dateKey, (day) => {
        const name = exportFileName(day);
        expect(name.startsWith(EXPORT_FILENAME_PREFIX)).toBe(true);
        expect(name.includes(day)).toBe(true);
        expect(name.endsWith('.json')).toBe(true);
      }),
    );
  });
});

// --- Property 5 (Task 2.6) ---

describe('Property 5: import validation matches storage validation', () => {
  // Feature: data-export-import, Property 5: Import validation matches storage validation exactly
  it('parseImport(JSON.stringify(value)).ok === isValidAppState(value) for any JSON value', () => {
    // Mix arbitrary JSON with generated valid states so both branches of the
    // biconditional are exercised.
    const jsonOrState = fc.oneof(arbJsonValue, arbState as fc.Arbitrary<unknown>);

    fc.assert(
      fc.property(jsonOrState, (value) => {
        const result = parseImport(JSON.stringify(value));
        expect(result.ok).toBe(isValidAppState(value));
      }),
    );
  });
});

// Reference EMPTY_STATE so the import is exercised and available for any future
// example checks; keeps the valid-state shape visible in this file.
void EMPTY_STATE;

// --- Example/boundary unit tests (Task 2.7; Requirements 2.3, 4.2, 4.3, 1.3, 4.4) ---

describe('dataTransfer examples and boundaries', () => {
  describe('parseImport rejects corrupt payloads (R2.3, R4.2, R4.3)', () => {
    it('rejects a non-JSON string with a non-empty error and no state', () => {
      const result = parseImport('this is not json {');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
      }
      expect('state' in result).toBe(false);
    });

    it('rejects JSON with a wrong version (version: 2)', () => {
      const payload = JSON.stringify({ version: 2, tasks: [], habits: [] });
      const result = parseImport(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
      }
      expect('state' in result).toBe(false);
    });

    it('rejects JSON missing the habits array', () => {
      const payload = JSON.stringify({ version: 1, tasks: [] });
      const result = parseImport(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
      }
      expect('state' in result).toBe(false);
    });

    it('rejects JSON with a task missing its status field', () => {
      const task = {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Write report',
        dueDate: null,
        tags: [],
        // status intentionally omitted
        completedAt: null,
        createdAt: 1_700_000_000_000,
      };
      const payload = JSON.stringify({ version: 1, tasks: [task], habits: [] });
      const result = parseImport(payload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
      }
      expect('state' in result).toBe(false);
    });
  });

  describe('EMPTY_STATE round-trip (R4.4)', () => {
    it('parseImport(serializeState(EMPTY_STATE)) returns ok:true with a state deep-equal to EMPTY_STATE', () => {
      const result = parseImport(serializeState(EMPTY_STATE));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.state).toEqual(EMPTY_STATE);
        expect(result.state.version).toBe(1);
        expect(result.state.tasks).toEqual([]);
        expect(result.state.habits).toEqual([]);
      }
    });
  });

  describe('exportFileName exact output (R1.3)', () => {
    it("exportFileName('2024-06-03') === 'task-habit-tracker-backup-2024-06-03.json'", () => {
      expect(exportFileName('2024-06-03')).toBe('task-habit-tracker-backup-2024-06-03.json');
    });

    it('builds the name from the fixed prefix, the given day, and the .json extension', () => {
      expect(exportFileName('2000-01-01')).toBe(`${EXPORT_FILENAME_PREFIX}-2000-01-01.json`);
    });
  });
});
