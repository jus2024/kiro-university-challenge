// Feature: task-habit-tracker
// Unit tests for the application reducer (Task 12.2;
// Requirements 1.1, 2.1, 3.1, 4.2, 5.1, 7.1, 8.1, 8.3, 13.1).

import { describe, it, expect } from 'vitest';
import type { AppState } from '../domain/types';
import { appReducer } from './appReducer';

const empty: AppState = { version: 1, tasks: [], habits: [] };

function withOneTask(): { state: AppState; id: string } {
  const created = appReducer(empty, {
    type: 'CREATE_TASK',
    input: { title: 'Write tests', dueDate: null, tags: [] },
  });
  return { state: created, id: created.tasks[0].id };
}

describe('appReducer', () => {
  it('CREATE_TASK appends a task (R1.1)', () => {
    const { state } = withOneTask();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe('Write tests');
    expect(state.tasks[0].status).toBe('open');
  });

  it('COMPLETE_TASK sets status done and stamps completedAt (R2.1)', () => {
    const { state, id } = withOneTask();
    const done = appReducer(state, { type: 'COMPLETE_TASK', taskId: id, now: 1_000 });
    expect(done.tasks[0].status).toBe('done');
    expect(done.tasks[0].completedAt).toBe(1_000);
  });

  it('EDIT_TASK updates the title (R3.1)', () => {
    const { state, id } = withOneTask();
    const edited = appReducer(state, {
      type: 'EDIT_TASK',
      taskId: id,
      patch: { title: 'Updated title' },
    });
    expect(edited.tasks[0].title).toBe('Updated title');
  });

  it('DELETE_TASK removes the task (R4.2)', () => {
    const { state, id } = withOneTask();
    const deleted = appReducer(state, { type: 'DELETE_TASK', taskId: id });
    expect(deleted.tasks).toHaveLength(0);
  });

  it('ADD_TAG associates a tag with the task (R5.1)', () => {
    const { state, id } = withOneTask();
    const tagged = appReducer(state, { type: 'ADD_TAG', taskId: id, tagName: 'urgent' });
    expect(tagged.tasks[0].tags).toEqual(['urgent']);
  });

  it('CREATE_HABIT appends a habit (R7.1)', () => {
    const withHabit = appReducer(empty, {
      type: 'CREATE_HABIT',
      input: { name: 'Read', targetFrequency: 'daily' },
    });
    expect(withHabit.habits).toHaveLength(1);
    expect(withHabit.habits[0].name).toBe('Read');
    expect(withHabit.habits[0].completions).toEqual([]);
  });

  it('CHECK_HABIT then UNCHECK_HABIT record and remove a completion (R8.1, R8.3)', () => {
    const withHabit = appReducer(empty, {
      type: 'CREATE_HABIT',
      input: { name: 'Read', targetFrequency: 'daily' },
    });
    const habitId = withHabit.habits[0].id;
    const checked = appReducer(withHabit, { type: 'CHECK_HABIT', habitId, day: '2024-06-05' });
    expect(checked.habits[0].completions).toEqual(['2024-06-05']);
    const unchecked = appReducer(checked, { type: 'UNCHECK_HABIT', habitId, day: '2024-06-05' });
    expect(unchecked.habits[0].completions).toEqual([]);
  });

  it('HYDRATE replaces the state wholesale (R13.1)', () => {
    const replacement: AppState = {
      version: 1,
      tasks: [
        {
          id: 'x',
          title: 'restored',
          dueDate: null,
          tags: [],
          status: 'open',
          completedAt: null,
          createdAt: 0,
        },
      ],
      habits: [],
    };
    const hydrated = appReducer(empty, { type: 'HYDRATE', state: replacement });
    expect(hydrated).toBe(replacement);
  });

  describe('invalid mutations leave state unchanged', () => {
    it('CREATE_TASK with an empty title is a no-op (returns same reference)', () => {
      const result = appReducer(empty, {
        type: 'CREATE_TASK',
        input: { title: '   ', dueDate: null, tags: [] },
      });
      expect(result).toBe(empty);
    });

    it('EDIT_TASK with an over-length title is a no-op', () => {
      const { state, id } = withOneTask();
      const tooLong = 'a'.repeat(201);
      const result = appReducer(state, { type: 'EDIT_TASK', taskId: id, patch: { title: tooLong } });
      expect(result).toBe(state);
    });

    it('ADD_TAG with a duplicate tag is a no-op', () => {
      const { state, id } = withOneTask();
      const once = appReducer(state, { type: 'ADD_TAG', taskId: id, tagName: 'dup' });
      const twice = appReducer(once, { type: 'ADD_TAG', taskId: id, tagName: 'dup' });
      expect(twice).toBe(once);
      expect(twice.tasks[0].tags).toEqual(['dup']);
    });

    it('CREATE_HABIT with an empty name is a no-op', () => {
      const result = appReducer(empty, {
        type: 'CREATE_HABIT',
        input: { name: '  ', targetFrequency: 'daily' },
      });
      expect(result).toBe(empty);
    });
  });
});
