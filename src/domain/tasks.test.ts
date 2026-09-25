// Feature: task-habit-tracker
// Property-based tests for the task lifecycle
// (Tasks 5.2, 5.3, 5.4, 5.5; Properties 1, 7, 8, 2; Requirements 1.1, 1.2, 2.1, 2.2, 2.4, 3.1, 3.3, 4.2).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { AppState, Task } from './types';
import { createTask, completeTask, deleteTask, editTask, reopenTask } from './tasks';

// --- Generators ---

// A valid tag name: trimmed length 1..50, no surrounding whitespace.
const validTagName = fc
  .array(fc.constantFrom('a', 'B', '3', 'é', '漢', '-', '_'), { minLength: 1, maxLength: 50 })
  .map((c) => c.join(''));

// A valid title: trimmed length 1..200 (kept modest for speed), incl. non-ASCII.
const validTitleCore = fc
  .array(fc.constantFrom('x', 'Y', '7', 'ü', '🙂', ' ', '-'), { minLength: 1, maxLength: 40 })
  .map((c) => c.join(''))
  // Guarantee a non-whitespace character so the trimmed length is >= 1.
  .map((s) => (s.trim().length === 0 ? `t${s}` : s));

// A distinct list of 0..5 valid tags.
const validTags = fc
  .uniqueArray(validTagName, { minLength: 0, maxLength: 5 });

// A NewTaskInput with a valid title, optional due date, and valid tags.
const newTaskInput = fc.record({
  title: validTitleCore,
  dueDate: fc.option(
    fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31) }).map((d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }),
    { nil: null },
  ),
  tags: validTags,
});

// An arbitrary existing task (already-normalized values are fine for these tests).
const arbTask: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  title: validTitleCore.map((s) => s.trim()),
  dueDate: fc.constant<string | null>(null),
  tags: validTags,
  status: fc.constantFrom<'open' | 'done'>('open', 'done'),
  completedAt: fc.option(fc.integer({ min: 0, max: 2_000_000_000_000 }), { nil: null }),
  createdAt: fc.integer({ min: 0, max: 2_000_000_000_000 }),
});

const arbState: fc.Arbitrary<AppState> = fc
  .uniqueArray(arbTask, { selector: (t) => t.id, maxLength: 8 })
  .map((tasks) => ({ version: 1 as const, tasks, habits: [] }));

// --- Property 1 ---

describe('createTask', () => {
  // Feature: task-habit-tracker, Property 1: Task creation grows the list and preserves inputs
  it('Property 1: grows the list by one and preserves the trimmed inputs', () => {
    fc.assert(
      fc.property(arbState, newTaskInput, (state, input) => {
        const next = createTask(state, input);
        expect(next.tasks.length).toBe(state.tasks.length + 1);
        const created = next.tasks[next.tasks.length - 1];
        expect(created.title).toBe(input.title.trim());
        expect(created.dueDate).toBe(input.dueDate);
        expect(created.tags).toEqual(input.tags);
        expect(created.status).toBe('open');
        expect(created.completedAt).toBeNull();
      }),
    );
  });
});

// --- Property 7 ---

describe('completeTask', () => {
  // Feature: task-habit-tracker, Property 7: Completing a task is idempotent and stamps once
  it('Property 7: first complete stamps now; re-complete keeps the original timestamp', () => {
    fc.assert(
      fc.property(
        arbState,
        newTaskInput,
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (state, input, now, delta) => {
          // Create a fresh open task so we know its id and initial status.
          const withTask = createTask(state, input);
          const created = withTask.tasks[withTask.tasks.length - 1];

          const after = completeTask(withTask, created.id, now);
          const done = after.tasks.find((t) => t.id === created.id)!;
          expect(done.status).toBe('done');
          expect(done.completedAt).toBe(now);

          // Re-complete with a strictly later timestamp: stamp is unchanged.
          const now2 = now + delta;
          const again = completeTask(after, created.id, now2);
          const stillDone = again.tasks.find((t) => t.id === created.id)!;
          expect(stillDone.status).toBe('done');
          expect(stillDone.completedAt).toBe(now);
        },
      ),
    );
  });
});

// --- Property 9 (reopen) ---

describe('reopenTask', () => {
  // Feature: task-habit-tracker, Property 9: Reopening a task clears completion, is idempotent, and touches only the target
  it('Property 9: reopen sets status open + completedAt null when done, no-ops when open, and never changes other tasks', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        fc.pre(state.tasks.length > 0);
        return fc.assert(
          fc.property(fc.nat(state.tasks.length - 1), (idx) => {
            const target = state.tasks[idx];
            const next = reopenTask(state, target.id);

            if (target.status === 'open') {
              // Idempotent: already-open task leaves the state unchanged.
              expect(next).toBe(state);
            } else {
              // Done -> open: status flips and the completion stamp is cleared.
              const updated = next.tasks.find((t) => t.id === target.id)!;
              expect(updated.status).toBe('open');
              expect(updated.completedAt).toBeNull();
            }

            // Every other task is left exactly as it was.
            for (const other of state.tasks) {
              if (other.id !== target.id) {
                expect(next.tasks).toContainEqual(other);
              }
            }
            // The task count never changes.
            expect(next.tasks.length).toBe(state.tasks.length);
          }),
          { numRuns: 5 },
        );
      }),
    );
  });

  // Feature: task-habit-tracker, Property 10: Complete-then-reopen round-trip yields an open task with no completion stamp
  it('Property 10: completing then reopening a task yields status open with completedAt null', () => {
    fc.assert(
      fc.property(
        arbState,
        newTaskInput,
        fc.integer({ min: 0, max: 1_000_000_000_000 }),
        (state, input, now) => {
          // Create a fresh open task so we know its id.
          const withTask = createTask(state, input);
          const created = withTask.tasks[withTask.tasks.length - 1];

          const completed = completeTask(withTask, created.id, now);
          const done = completed.tasks.find((t) => t.id === created.id)!;
          expect(done.status).toBe('done');
          expect(done.completedAt).toBe(now);

          const reopened = reopenTask(completed, created.id);
          const open = reopened.tasks.find((t) => t.id === created.id)!;
          expect(open.status).toBe('open');
          expect(open.completedAt).toBeNull();

          // Reopening again is a no-op (already open).
          const again = reopenTask(reopened, created.id);
          expect(again).toBe(reopened);
        },
      ),
    );
  });

  // Feature: task-habit-tracker, Property 11: Reopening an unknown task id leaves state unchanged
  it('Property 11: reopening a non-existent task id returns the input state unchanged', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        const next = reopenTask(state, 'no-such-id');
        expect(next).toBe(state);
      }),
    );
  });
});

// --- Property 8 ---

describe('deleteTask', () => {
  // Feature: task-habit-tracker, Property 8: Deleting a task removes only that task
  it('Property 8: removes exactly the target task and keeps all others', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        fc.pre(state.tasks.length > 0);
        return fc.assert(
          fc.property(fc.nat(state.tasks.length - 1), (idx) => {
            const target = state.tasks[idx];
            const next = deleteTask(state, target.id);
            expect(next.tasks.length).toBe(state.tasks.length - 1);
            expect(next.tasks.find((t) => t.id === target.id)).toBeUndefined();
            for (const other of state.tasks) {
              if (other.id !== target.id) {
                expect(next.tasks).toContainEqual(other);
              }
            }
          }),
          { numRuns: 5 },
        );
      }),
    );
  });
});

// --- Property 2 (edit branch) ---

describe('editTask', () => {
  // Feature: task-habit-tracker, Property 2: Title validity governs task creation and edits
  it('Property 2 (edit): invalid title leaves state unchanged; valid title applies trimmed value', () => {
    fc.assert(
      fc.property(arbState, (state) => {
        fc.pre(state.tasks.length > 0);
        return fc.assert(
          fc.property(
            fc.nat(state.tasks.length - 1),
            fc.oneof(
              fc.constant(''),
              fc.constant('   '),
              fc.array(fc.constant('a'), { minLength: 201, maxLength: 201 }).map((c) => c.join('')),
            ),
            validTitleCore,
            (idx, invalidTitle, validTitle) => {
              const target = state.tasks[idx];

              // Invalid title: state is returned unchanged (same reference).
              const rejected = editTask(state, target.id, { title: invalidTitle });
              expect(rejected).toBe(state);

              // Valid title: the matching task's title becomes the trimmed value.
              const accepted = editTask(state, target.id, { title: validTitle });
              const updated = accepted.tasks.find((t) => t.id === target.id)!;
              expect(updated.title).toBe(validTitle.trim());
            },
          ),
          { numRuns: 5 },
        );
      }),
    );
  });
});
