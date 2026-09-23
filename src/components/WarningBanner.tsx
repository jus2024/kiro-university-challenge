// Feature: task-habit-tracker
// UI: a non-blocking, dismissible banner for storage warnings.
//
// Storage failures are surfaced without interrupting the user: when a write
// fails the in-memory state is kept and a warning is shown (R12.2), and when
// saved data cannot be restored the app starts empty and shows a warning
// (R13.2). This banner reads that `warning` from the app context and renders
// it as a `role="status"` region with `aria-live="polite"`, so assistive
// technology announces it without stealing focus or blocking interaction with
// the rest of the app. The dismiss control is a native `<button>` carrying an
// explicit accessible label (R15.2) that clears the warning via
// `dismissWarning`.

import { useApp } from '../state/AppContext';

/**
 * Render the current storage warning as a non-blocking, dismissible banner.
 *
 * Returns `null` when there is no warning so nothing is rendered in the common
 * case. When a warning is present, it is shown in a polite live region with a
 * labeled dismiss button that clears it through the context.
 */
export function WarningBanner(): JSX.Element | null {
  const { warning, dismissWarning } = useApp();

  if (warning === null) {
    return null;
  }

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900"
      role="status"
      aria-live="polite"
    >
      <span className="flex-1 text-sm">{warning}</span>
      <button
        type="button"
        className="inline-flex min-h-9 items-center justify-center rounded-md border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        aria-label="Dismiss warning"
        onClick={dismissWarning}
      >
        Dismiss
      </button>
    </div>
  );
}
