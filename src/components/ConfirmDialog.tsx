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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      className="confirm-dialog"
      onKeyDown={handleKeyDown}
    >
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog__actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
