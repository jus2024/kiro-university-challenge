// Feature: task-habit-tracker
// Property-based tests for tag association and filtering
// (Tasks 6.2, 6.3, 6.4; Properties 4, 5, 6; Requirements 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { AppState, Task } from './types';
import { addTagToTask, availableTags, filterTasksByTags } from './tags';

const validTagName = fc
  .array(fc.constantFrom('a', 'B', '3', 'é', '漢', '-', '_'), { minLength: 1, maxLength: 50 })
  .map((c) => c.join(''));

function makeTask(id: string, tags: string[]): Task {
  return {
    id,
    title: 'task',
    dueDate: null,
    tags,
    status: 'open',
    completedAt: null,
    createdAt: 0,
  };
}

// --- Property 4 ---

describe('addTagToTask', () => {
  // Feature: task-habit-tracker, Property 4: Tag-add semantics (valid, distinct, capped)
  it('Property 4: adds iff valid, distinct, and under the 20-tag cap; else leaves tags unchanged', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(validTagName, { minLength: 0, maxLength: 22 }),
        fc.oneof(
          validTagName, // usually valid
          fc.constant(''), // invalid: empty
          fc.constant('   '), // invalid: whitespace-only
          fc.array(fc.constant('a'), { minLength: 51, maxLength: 51 }).map((c) => c.join('')), // >50
        ),
        (existing, candidate) => {
          const state: AppState = { version: 1, tasks: [makeTask('t1', existing)], habits: [] };
          const next = addTagToTask(state, 't1', candidate);
          const trimmed = candidate.trim();

          const nameValid = trimmed.length >= 1 && trimmed.length <= 50;
          const distinct = !existing.includes(trimmed);
          const underCap = existing.length < 20;
          const shouldAdd = nameValid && distinct && underCap;

          const resultTags = next.tasks[0].tags;
          if (shouldAdd) {
            expect(resultTags).toEqual([...existing, trimmed]);
            // Distinct and within cap.
            expect(new Set(resultTags).size).toBe(resultTags.length);
            expect(resultTags.length).toBeLessThanOrEqual(20);
          } else {
            // Rejected: unchanged (same reference).
            expect(next).toBe(state);
            expect(resultTags).toEqual(existing);
          }
        },
      ),
    );
  });
});

// --- Property 5 ---

describe('availableTags', () => {
  // Feature: task-habit-tracker, Property 5: Available tags are exactly the distinct tags in use
  it('Property 5: returns each in-use tag once and no unused names', () => {
    const taskWithTags = fc.record({
      id: fc.uuid(),
      tags: fc.uniqueArray(validTagName, { maxLength: 6 }),
    });
    fc.assert(
      fc.property(fc.uniqueArray(taskWithTags, { selector: (t) => t.id, maxLength: 8 }), (specs) => {
        const state: AppState = {
          version: 1,
          tasks: specs.map((s) => makeTask(s.id, s.tags)),
          habits: [],
        };
        const result = availableTags(state);

        // Expected distinct set of tags actually in use.
        const expected = new Set<string>();
        for (const s of specs) for (const t of s.tags) expected.add(t);

        // No duplicates.
        expect(new Set(result).size).toBe(result.length);
        // Exactly the in-use set (order aside).
        expect(new Set(result)).toEqual(expected);
      }),
    );
  });
});

// --- Property 6 ---

describe('filterTasksByTags', () => {
  // Feature: task-habit-tracker, Property 6: Tag filtering returns exactly the tasks matching all selected tags
  it('Property 6: returns tasks whose tags are a superset of the selection; empty selection returns all', () => {
    const tagPool = ['red', 'green', 'blue', 'urgent', 'home', 'work'];
    const taskGen = fc.record({
      id: fc.uuid(),
      tags: fc.uniqueArray(fc.constantFrom(...tagPool), { maxLength: tagPool.length }),
    });
    fc.assert(
      fc.property(
        fc.uniqueArray(taskGen, { selector: (t) => t.id, maxLength: 10 }),
        fc.uniqueArray(fc.constantFrom(...tagPool), { maxLength: tagPool.length }),
        (specs, selected) => {
          const tasks = specs.map((s) => makeTask(s.id, s.tags));
          const result = filterTasksByTags(tasks, selected);

          if (selected.length === 0) {
            expect(result).toEqual(tasks);
            return;
          }
          const expected = tasks.filter((t) => {
            const set = new Set(t.tags);
            return selected.every((sel) => set.has(sel));
          });
          expect(result).toEqual(expected);
          // Every returned task truly contains all selected tags.
          for (const t of result) {
            const set = new Set(t.tags);
            expect(selected.every((sel) => set.has(sel))).toBe(true);
          }
        },
      ),
    );
  });
});
