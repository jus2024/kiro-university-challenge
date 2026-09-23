// Feature: task-habit-tracker
// UI: a small confirmation dialog used to guard destructive actions.
//
// The dialog is presentation-only: it renders confirm/cancel controls and
// reports the user's choice through `onConfirm`/`onCancel` callbacks. It holds
// no domain state and dispatches nothing itself, so it can guard any
// destructive action (R4.1). Deleting a task removes nothing until the user
// confirms; cancelling closes the dialog without side effects (R4.4).

import { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  /** Accessible dialog title, e.g. "Delete task". */
  title: string;
  /** Descriptive body text explaining what will happen. */
  message: string;
  /** Label for the confirming button (defaults to "Confirm"). */
  confirmLabel?: string;
  /** Label for the cancelling button (defaults to "Cancel"). */
  cancelLabel?: string;
  /** Invoked when the user confirms the destructive action (R4.2). */
  onConfirm: () => void;
  /** Invoked when the user cancels; closes without any dispatch (R4.4). */
  onCancel: () => void;
}

/**
 * A modal confirmation dialog rendered with native controls.
 *
 * Both actions are real `<button>` elements, so Enter and Space activate them
 * the same way a pointer click does with no extra key handling (R14.3). The
 * dialog exposes `role="dialog"` with `aria-modal` and is labelled/described by
 * its title and message so assistive technology announces its purpose (R15.2).
 * Escape triggers `onCancel` as a keyboard-friendly close, and focus is moved
 * to the cancel button on open so keyboard users start inside the dialog.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog on open so keyboard users are not left behind
  // the trigger, and default the focus to the non-destructive action.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-slate-900"
        >
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-slate-600">
          {message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
