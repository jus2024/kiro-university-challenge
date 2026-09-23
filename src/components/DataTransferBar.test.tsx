// Feature: data-export-import
// Component / interaction tests for DataTransferBar (Tasks 3.2–3.6).
//
// These render the real DataTransferBar wrapped in the real AppProvider so
// useApp() works end-to-end: AppProvider hydrates from localStorage on mount,
// so seeding localStorage under the storage key controls the initial in-memory
// workspace, and dispatching HYDRATE flows through the reducer/context.
//
// State assertions read the *in-memory* AppState through a small StateProbe
// consumer rather than localStorage: the requirements are stated over the
// "current in-memory AppState", and the provider's save-on-change effect is
// exercised separately by the integration tests (Task 4.1).
//
//   Export ................ R1.1, R1.2, R1.3, R1.4   (Task 3.2)
//   Import confirm path ... R3.1, R3.3, R3.4          (Task 3.3)
//   Import empty workspace  R3.2                       (Task 3.4)
//   Invalid/oversize files  R2.3, R4.2, R4.3           (Task 3.5)
//   Accessibility ......... R5.1, R5.3, R6.1–R6.4      (Task 3.6)

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider, useApp } from '../state/AppContext';
import { DataTransferBar } from './DataTransferBar';
import {
  exportFileName,
  MAX_IMPORT_BYTES,
  serializeState,
} from '../domain/dataTransfer';
import { toDateKey } from '../domain/dateUtils';
import type { AppState, Habit, Task } from '../domain/types';

// The single localStorage key the Storage_Manager persists AppState under.
const STORAGE_KEY = 'task-habit-tracker/state';

/** Exposes the current in-memory AppState so tests can assert on it directly. */
function StateProbe() {
  const { state } = useApp();
  return <div data-testid="state-probe">{serializeState(state)}</div>;
}

function probeState(): AppState {
  return JSON.parse(screen.getByTestId('state-probe').textContent ?? '') as AppState;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't-1',
    title: 'Existing task',
    dueDate: null,
    tags: [],
    status: 'open',
    completedAt: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h-1',
    name: 'Existing habit',
    targetFrequency: 'daily',
    completions: [],
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

/** A valid, populated AppState distinct from any seeded workspace. */
function importedState(): AppState {
  return {
    version: 1,
    tasks: [
      makeTask({
        id: 'imported-task',
        title: 'Imported task title',
        tags: ['imported-tag'],
      }),
    ],
    habits: [makeHabit({ id: 'imported-habit', name: 'Imported habit name' })],
  };
}

/** Seed the workspace AppProvider hydrates from on mount. */
function seedWorkspace(state: AppState | null) {
  if (state === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
  }
}

function renderBar() {
  return render(
    <AppProvider>
      <DataTransferBar />
      <StateProbe />
    </AppProvider>,
  );
}

/**
 * Build a File whose .text()/FileReader read yields `contents`. jsdom's
 * File/Blob support text reads natively, so a plain File is sufficient.
 */
function jsonFile(contents: string, name = 'backup.json'): File {
  return new File([contents], name, { type: 'application/json' });
}

/** A File that reports an oversize `size` without allocating 10MB of data. */
function oversizeFile(): File {
  const file = jsonFile(serializeState(importedState()), 'huge.json');
  Object.defineProperty(file, 'size', {
    value: MAX_IMPORT_BYTES + 1,
    configurable: true,
  });
  return file;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// --- Task 3.2: Export (R1.1, R1.2, R1.3, R1.4) ---

describe('DataTransferBar — export (Task 3.2)', () => {
  it('serializes state and triggers a download with the ISO-dated filename (R1.1, R1.2, R1.3)', async () => {
    const user = userEvent.setup();
    seedWorkspace(importedState());

    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    let capturedDownload: string | null = null;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        capturedDownload = this.download;
      });

    renderBar();
    await screen.findByRole('button', { name: /export/i });

    await user.click(screen.getByRole('button', { name: /export/i }));

    // R1.2: a browser download was triggered via the transient anchor.
    expect(clickSpy).toHaveBeenCalledTimes(1);
    // R1.1: an object URL was produced from the serialized blob.
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    // R1.3: filename = fixed prefix + today (YYYY-MM-DD) + .json.
    expect(capturedDownload).toBe(exportFileName(toDateKey(new Date())));

    // Success is announced non-blockingly; no error is shown.
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a non-blocking error and leaves state unchanged when download setup throws (R1.4)', async () => {
    const user = userEvent.setup();
    seedWorkspace(importedState());

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => {
        throw new Error('boom');
      }),
      revokeObjectURL: vi.fn(),
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

    renderBar();
    await screen.findByRole('button', { name: /export/i });
    const before = probeState();

    await user.click(screen.getByRole('button', { name: /export/i }));

    // R1.4: non-blocking error surfaced, no download attempted.
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(clickSpy).not.toHaveBeenCalled();
    // R1.4: in-memory state is untouched (export never mutates state).
    expect(probeState()).toEqual(before);
  });
});

// --- Task 3.3: Import confirm path (R3.1, R3.3, R3.4) ---

describe('DataTransferBar — import confirm path (Task 3.3)', () => {
  it('opens ConfirmDialog for a valid file in a non-empty workspace and applies on confirm (R3.1, R3.3)', async () => {
    const user = userEvent.setup();
    seedWorkspace({ version: 1, tasks: [makeTask()], habits: [] });

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile(serializeState(importedState())));

    // R3.1: a confirmation dialog guards the non-empty workspace.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /replace data/i }));

    // R3.3: HYDRATE applied — the imported state replaces the current one.
    await waitFor(() => {
      expect(probeState()).toEqual(importedState());
    });
    // Dialog closed and a success message is shown.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });

  it('leaves state unchanged when the confirmation is cancelled (R3.4)', async () => {
    const user = userEvent.setup();
    const seeded: AppState = { version: 1, tasks: [makeTask()], habits: [] };
    seedWorkspace(seeded);

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    const before = probeState();

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile(serializeState(importedState())));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    // R3.4: no dispatch; in-memory state is the original seed, dialog closed.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(probeState()).toEqual(before);
    expect(before).toEqual(seeded);
  });

  it('leaves state unchanged when the confirmation is dismissed with Escape (R3.4)', async () => {
    const user = userEvent.setup();
    const seeded: AppState = { version: 1, tasks: [makeTask()], habits: [] };
    seedWorkspace(seeded);

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    const before = probeState();

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile(serializeState(importedState())));

    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    // R3.4: Escape dismisses without dispatch; original state stands.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(probeState()).toEqual(before);
    expect(before).toEqual(seeded);
  });
});

// --- Task 3.4: Import into an empty workspace (R3.2) ---

describe('DataTransferBar — import into empty workspace (Task 3.4)', () => {
  it('applies a valid file with no confirmation dialog when the workspace is empty (R3.2)', async () => {
    const user = userEvent.setup();
    seedWorkspace(null); // no tasks, no habits

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    expect(probeState()).toEqual({ version: 1, tasks: [], habits: [] });

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile(serializeState(importedState())));

    // R3.2: state replaced directly, with no dialog shown.
    await waitFor(() => {
      expect(probeState()).toEqual(importedState());
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});

// --- Task 3.5: Invalid / oversize import files (R2.3, R4.2, R4.3) ---

describe('DataTransferBar — invalid/oversize files (Task 3.5)', () => {
  it('rejects a non-JSON file with a non-blocking error and no dispatch (R2.3, R4.3)', async () => {
    const user = userEvent.setup();
    seedWorkspace({ version: 1, tasks: [makeTask()], habits: [] });

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    const before = probeState();

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile('this is not json {{{', 'notes.txt'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // R2.3/R4.3: nothing dispatched; in-memory state unchanged.
    expect(probeState()).toEqual(before);
  });

  it('rejects a schema-invalid file with a non-blocking error and no dispatch (R2.3, R4.2)', async () => {
    const user = userEvent.setup();
    seedWorkspace({ version: 1, tasks: [makeTask()], habits: [] });

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    const before = probeState();

    // Valid JSON but wrong schema (version 2, missing habits array).
    const invalid = JSON.stringify({ version: 2, tasks: [] });
    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, jsonFile(invalid));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(probeState()).toEqual(before);
  });

  it('rejects an oversize file without reading it and leaves state unchanged (R2.3)', async () => {
    const user = userEvent.setup();
    seedWorkspace({ version: 1, tasks: [makeTask()], habits: [] });

    renderBar();
    await screen.findByLabelText(/import/i, { selector: 'input' });
    const before = probeState();

    const input = screen.getByLabelText(/import/i, { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, oversizeFile());

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(probeState()).toEqual(before);
  });
});

// --- Task 3.6: Accessibility (R5.1, R5.3, R6.1–R6.4) ---

describe('DataTransferBar — accessibility (Task 3.6)', () => {
  it('exposes distinct, non-empty accessible names for export and import (R6.1, R6.2, R6.3)', async () => {
    seedWorkspace(null);
    renderBar();

    const exportBtn = await screen.findByRole('button', { name: /export/i });
    const importControl = screen.getByLabelText(/import/i, { selector: 'input' });

    // R6.1/R6.2: both controls have a non-empty accessible name.
    const exportName = (exportBtn.getAttribute('aria-label') ?? exportBtn.textContent ?? '').trim();
    const importName = (importControl.getAttribute('aria-label') ?? '').trim();
    expect(exportName.length).toBeGreaterThan(0);
    expect(importName.length).toBeGreaterThan(0);
    // R6.3: the two accessible names are distinct.
    expect(exportName.toLowerCase()).not.toBe(importName.toLowerCase());
  });

  it('keeps accessible labels present and unchanged across focus (R6.4, R5.1)', async () => {
    const user = userEvent.setup();
    seedWorkspace(null);
    renderBar();

    const exportBtn = await screen.findByRole('button', { name: /export/i });
    const importControl = screen.getByLabelText(/import/i, { selector: 'input' });
    const exportLabelBefore = exportBtn.getAttribute('aria-label');
    const importLabelBefore = importControl.getAttribute('aria-label');

    // R5.1: both controls are reachable via keyboard focus (native, in tab order).
    await user.tab();
    expect(exportBtn).toHaveFocus();
    await user.tab();
    expect(importControl).toHaveFocus();

    // R6.4: labels unchanged while focused.
    expect(exportBtn.getAttribute('aria-label')).toBe(exportLabelBefore);
    expect(importControl.getAttribute('aria-label')).toBe(importLabelBefore);
  });

  it('activates export the same way with Enter and Space as with a click (R5.3)', async () => {
    const user = userEvent.setup();
    seedWorkspace(importedState());

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    renderBar();
    const exportBtn = await screen.findByRole('button', { name: /export/i });

    exportBtn.focus();
    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });
});
