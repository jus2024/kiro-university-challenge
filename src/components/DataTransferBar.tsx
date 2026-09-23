// Feature: data-export-import
// UI: the export/import toolbar. Owns every side effect the transfer feature
// needs — Blob creation, object URL, transient anchor download, hidden
// <input type="file"> + FileReader — while all pure logic (serialize, parse,
// validate, filename) lives in `domain/dataTransfer.ts`. It reads canonical
// state and dispatches via `useApp()`, reuses the existing `HYDRATE` action to
// replace state wholesale (relying on `AppProvider`'s save-on-change effect to
// persist), guards a non-empty workspace with the reused `ConfirmDialog`, and
// surfaces success/failure through a local non-blocking status/error region
// mirroring `WarningBanner`'s accessible pattern.
//
// Design references (requirements.md):
//   Export .................. R1.1–R1.4
//   Import + persistence .... R2.1–R2.4
//   Confirm before replace .. R3.1–R3.4
//   Validation at the edge .. R4.2, R4.3
//   Keyboard operability .... R5.1–R5.4
//   Accessible labels ....... R6.1–R6.4

import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { toDateKey } from '../domain/dateUtils';
import {
  MAX_IMPORT_BYTES,
  exportFileName,
  parseImport,
  serializeState,
} from '../domain/dataTransfer';
import type { AppState } from '../domain/types';
import ConfirmDialog from './ConfirmDialog';

/** A non-blocking status/error message shown near the controls. */
type TransferMessage =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

/**
 * Render the export and import controls plus their non-blocking status region.
 *
 * Export is a native `<button>`; import is a labeled `<input type="file">`, so
 * both inherit keyboard reachability, Enter/Space activation, and visible focus
 * from the platform (R5). Each carries a distinct, stable accessible name (R6).
 */
export function DataTransferBar(): JSX.Element {
  const { state, dispatch, warning } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<TransferMessage | null>(null);
  // Holds a parsed, validated import awaiting user confirmation, together with
  // the pre-import state captured for rollback. Null when no dialog is open.
  const [pending, setPending] = useState<
    { imported: AppState; previousState: AppState } | null
  >(null);
  // Tracks an in-flight import so a failed provider save can be rolled back
  // (R2.4). `imported` is the exact state object dispatched via HYDRATE (used to
  // detect that our dispatch has committed), `previousState` is the value to
  // restore, and `warningAtDispatch` is the provider warning captured before
  // dispatch so only a *new* warning is read as this save failing. Null when no
  // import is in flight.
  const pendingSaveRef = useRef<{
    imported: AppState;
    previousState: AppState;
    warningAtDispatch: string | null;
  } | null>(null);

  /** Reset the file input so selecting the same file again re-fires `change`. */
  function resetFileInput() {
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = '';
    }
  }

  // --- Export (R1.1–R1.4) ---

  function handleExport() {
    try {
      const json = serializeState(state); // R1.1
      const fileName = exportFileName(toDateKey(new Date())); // R1.3
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click(); // R1.2
        document.body.removeChild(anchor);
      } finally {
        URL.revokeObjectURL(url);
      }
      setMessage({ kind: 'success', text: 'Your data was exported.' });
    } catch {
      // Leave in-memory state untouched; surface a non-blocking error (R1.4).
      setMessage({
        kind: 'error',
        text: 'The export could not be completed. Your data was not changed.',
      });
    }
  }

  // --- Import (R2.x, R3.x, R4.2, R4.3) ---

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file === null) {
      return;
    }

    // Size guard before reading anything (R2.3). Oversize files are never read.
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({
        kind: 'error',
        text: 'The selected file is larger than 10 MB and could not be imported.',
      });
      resetFileInput();
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      // Unreadable file: state unchanged, non-blocking error (R2.3).
      setMessage({
        kind: 'error',
        text: 'The selected file could not be read and was not imported.',
      });
      resetFileInput();
    };

    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseImport(text); // R4.1: same validator as restore
      if (!result.ok) {
        // Invalid JSON or schema/version mismatch (R2.3, R4.2, R4.3).
        setMessage({ kind: 'error', text: result.error });
        resetFileInput();
        return;
      }

      const previousState = state; // capture for rollback (R2.4)
      const hasData = state.tasks.length > 0 || state.habits.length > 0;
      if (hasData) {
        // Guard replacement of a non-empty workspace (R3.1).
        setPending({ imported: result.state, previousState });
        resetFileInput();
      } else {
        // Empty workspace: apply directly with no confirmation (R3.2).
        applyImport(result.state, previousState);
        resetFileInput();
      }
    };

    reader.readAsText(file);
  }

  /**
   * Apply a validated import by dispatching `HYDRATE` (R2.1, R3.3), relying on
   * the provider's save-on-change effect to persist it (R2.2). Success is
   * announced optimistically here; the in-flight record armed below lets the
   * save-outcome effect roll back to `previousState` if that save fails (R2.4).
   */
  function applyImport(imported: AppState, previousState: AppState) {
    // Optimistically announce success (R2.1/R2.2 happy path). The provider's
    // save-on-change effect runs after this dispatch commits; if it fails it
    // sets `warning`, which the effect below detects to roll back (R2.4).
    pendingSaveRef.current = { imported, previousState, warningAtDispatch: warning };
    dispatch({ type: 'HYDRATE', state: imported });
    setMessage({ kind: 'success', text: 'Your data was imported.' });
  }

  // Roll back a failed post-import save (R2.4). The provider persists on every
  // state change and sets its non-blocking `warning` when `saveState` fails.
  // While an import is in flight, a `warning` that is newly present relative to
  // the value captured at dispatch means this save failed once our HYDRATE has
  // committed (`state === imported`): restore the pre-import state and replace
  // the optimistic success with a non-blocking "could not be saved" error. A
  // successful save produces no new warning, so the record is simply cleared
  // and the success message stands.
  useEffect(() => {
    const inFlight = pendingSaveRef.current;
    if (inFlight === null || state !== inFlight.imported) {
      return;
    }
    if (warning !== null && warning !== inFlight.warningAtDispatch) {
      pendingSaveRef.current = null;
      dispatch({ type: 'HYDRATE', state: inFlight.previousState });
      setMessage({
        kind: 'error',
        text: 'The import could not be saved. Your previous data has been restored.',
      });
    }
  }, [state, warning, dispatch]);

  function handleConfirmImport() {
    if (pending === null) {
      return;
    }
    applyImport(pending.imported, pending.previousState);
    setPending(null);
  }

  function handleCancelImport() {
    // Cancel or dismiss: no dispatch, state unchanged (R3.4).
    setPending(null);
  }

  return (
    <section
      aria-label="Data export and import"
      className="mb-6 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Backup &amp; restore</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExport}
            aria-label="Export data"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            Export data
          </button>

          {/*
            Import trigger: a <label> bound to a hidden native <input type="file">.
            The label carries the accessible name and is keyboard/click operable
            through the native input, which stays focusable (not display:none) via
            the sr-only utility so Tab reaches it and Enter/Space open the picker
            (R5.1, R5.3, R6.2).
          */}
          <label
            htmlFor="data-transfer-import-input"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500/50"
          >
            Import data
            <input
              ref={fileInputRef}
              id="data-transfer-import-input"
              type="file"
              accept="application/json"
              aria-label="Import data"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {message !== null && (
        <div className="mt-3">
          {message.kind === 'success' ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              {message.text}
            </p>
          ) : (
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
            >
              {message.text}
            </p>
          )}
        </div>
      )}

      {pending !== null && (
        <ConfirmDialog
          title="Replace all data?"
          message="Importing this file will replace all of your current tasks and habits. This cannot be undone."
          confirmLabel="Replace data"
          cancelLabel="Cancel"
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
        />
      )}
    </section>
  );
}
