// Feature: task-habit-tracker
// State layer: the application reducer.
//
// `appReducer` maps `(AppState, AppAction) -> AppState` by delegating to the
// pure domain functions. Like the domain layer it is itself pure and never
// throws: every mutating action forwards to a domain function that already
// returns the input state unchanged on an invalid mutation, so the reducer
// simply propagates that guarantee. `HYDRATE` replaces the current state with
// the state carried by the action (used to restore persisted state on load).

import type { AppState, DateKey, NewHabitInput, NewTaskInput, TaskPatch } from '../domain/types';
import { completeTask, createTask, deleteTask, editTask, reopenTask } from '../domain/tasks';
import { addTagToTask } from '../domain/tags';
import { checkOffHabit, createHabit, uncheckHabit } from '../domain/habits';

/** Every state transition the store understands. */
export type AppAction =
  | { type: 'CREATE_TASK'; input: NewTaskInput }
  | { type: 'EDIT_TASK'; taskId: string; patch: TaskPatch }
  | { type: 'COMPLETE_TASK'; taskId: string; now: number }
  | { type: 'REOPEN_TASK'; taskId: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'ADD_TAG'; taskId: string; tagName: string }
  | { type: 'CREATE_HABIT'; input: NewHabitInput }
  | { type: 'CHECK_HABIT'; habitId: string; day: DateKey }
  | { type: 'UNCHECK_HABIT'; habitId: string; day: DateKey }
  | { type: 'HYDRATE'; state: AppState };

/**
 * Reduce an `AppAction` against the current `AppState`, delegating to the
 * domain functions (R1.1, R2.1, R3.1, R4.2, R5.1, R7.1, R8.1, R8.3). `HYDRATE`
 * replaces state wholesale with the restored state (R13.1). The switch is
 * exhaustive over the action union; the `never` default makes any future
 * unhandled action a compile-time error while returning state unchanged at
 * runtime so the reducer never throws.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_TASK':
      return createTask(state, action.input);
    case 'EDIT_TASK':
      return editTask(state, action.taskId, action.patch);
    case 'COMPLETE_TASK':
      return completeTask(state, action.taskId, action.now);
    case 'REOPEN_TASK':
      return reopenTask(state, action.taskId);
    case 'DELETE_TASK':
      return deleteTask(state, action.taskId);
    case 'ADD_TAG':
      return addTagToTask(state, action.taskId, action.tagName);
    case 'CREATE_HABIT':
      return createHabit(state, action.input);
    case 'CHECK_HABIT':
      return checkOffHabit(state, action.habitId, action.day);
    case 'UNCHECK_HABIT':
      return uncheckHabit(state, action.habitId, action.day);
    case 'HYDRATE':
      return action.state;
    /* c8 ignore start */
    default: {
      // Exhaustiveness guard: if a new action type is added without a case,
      // this assignment fails to type-check. At runtime, state is returned
      // unchanged so the reducer never throws.
      return assertNever(action, state);
    }
    /* c8 ignore stop */
  }
}

/**
 * Compile-time exhaustiveness guard. The `never` parameter forces a type error
 * if a new `AppAction` variant is added without a matching `case`. At runtime
 * it is a no-op that returns the provided fallback state, keeping the reducer
 * total and non-throwing.
 */
function assertNever(_action: never, fallback: AppState): AppState {
  return fallback;
}
