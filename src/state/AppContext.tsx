// Feature: task-habit-tracker
// State layer: the React context, the `useApp()` hook, and the `AppProvider`.
//
// This module establishes the context object and the consumer hook, and hosts
// the composition-root `AppProvider` that wires persistence: it loads persisted
// state on mount via `loadState()` (seeding the reducer through `HYDRATE`) and
// persists the state after each committed mutation via `saveState()`, surfacing
// any storage warning without ever mutating in-memory state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EMPTY_STATE, type AppState } from '../domain/types';
import { loadState, saveState } from '../storage/storage';
import { appReducer, type AppAction } from './appReducer';

/**
 * The value exposed to components through the app context: the canonical
 * `state`, a typed `dispatch`, plus a non-blocking storage `warning`
 * (R12.2, R13.2) and a `dismissWarning` callback to clear it.
 */
export interface AppContextValue {
  state: AppState;
  dispatch: (action: AppAction) => void;
  /** Non-blocking storage warning surfaced to the UI (R12.2, R13.2). */
  warning: string | null;
  dismissWarning: () => void;
}

/**
 * The app context. Defaults to `undefined` so `useApp()` can detect and reject
 * use outside a provider. Exported so Task 15's `AppProvider` can supply the
 * value.
 */
export const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Access the app store. Must be called from within an `AppProvider`; throws a
 * clear error otherwise so misuse fails fast during development.
 */
export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (value === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return value;
}

/**
 * Composition root for the state layer. Hosts the reducer, restores persisted
 * state on mount, and persists after each committed mutation — surfacing any
 * storage warning through the context without altering in-memory state.
 *
 * - On mount it calls `loadState()` and dispatches `HYDRATE` with the restored
 *   state; a non-null restore warning is surfaced (R13.1, R13.2).
 * - After hydration, every subsequent `state` change is written back via
 *   `saveState(state)`; a failed write sets a non-null warning while leaving the
 *   in-memory state untouched (R12.1, R12.2).
 *
 * The reducer starts from `EMPTY_STATE` and a `hydratedState` ref guards the
 * save effect so the pre-hydration empty state and the freshly restored state
 * are never persisted over real stored data on first mount.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, EMPTY_STATE);
  const [warning, setWarning] = useState<string | null>(null);
  const dismissWarning = useCallback(() => setWarning(null), []);

  // Holds the exact state object produced by hydration. The save effect skips
  // any `state` that is still this reference — the pre-hydration EMPTY_STATE and
  // the freshly restored state — so the restored data is never written straight
  // back and only real committed mutations are persisted (R13.1). It starts as
  // EMPTY_STATE, the reducer's initial state, so the pre-hydration render is
  // skipped too.
  const hydratedState = useRef<AppState>(EMPTY_STATE);

  // Restore persisted state on mount (R13.1, R13.2).
  useEffect(() => {
    const { state: restored, warning: restoreWarning } = loadState();
    hydratedState.current = restored;
    dispatch({ type: 'HYDRATE', state: restored });
    if (restoreWarning !== null) {
      setWarning(restoreWarning);
    }
  }, []);

  // Persist after each committed mutation (R12.1, R12.2). The state produced by
  // hydration (and the initial EMPTY_STATE) is skipped so the restored state is
  // never written straight back over stored data; every later `state` change is
  // a real committed mutation and is persisted.
  useEffect(() => {
    if (state === hydratedState.current) {
      return;
    }
    const result = saveState(state);
    if (!result.ok) {
      // saveState leaves in-memory state untouched; only surface the warning.
      setWarning(result.warning);
    }
  }, [state]);

  const value: AppContextValue = { state, dispatch, warning, dismissWarning };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
