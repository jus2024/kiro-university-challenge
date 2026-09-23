// Feature: task-habit-tracker
// UI: the habit creation form (R7.1–R7.4, R15.1).
//
// A native <form> with a labeled name text input and a labeled
// target-frequency <select>. On submit the entered values are validated with
// the shared domain validators; on failure the values are retained and each
// error message is rendered adjacent to the offending field (never dispatching),
// and on success a CREATE_HABIT action is dispatched with the trimmed name and
// frequency and the form is cleared. Every input is programmatically associated
// with a <label> via htmlFor/id so it is reachable by accessible name.

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { TargetFrequency } from '../domain/types';
import { validateHabitName, validateTargetFrequency } from '../domain/validation';
import { useApp } from '../state/AppContext';

/**
 * Render the habit creation form. Reads `dispatch` from the app context and
 * dispatches `CREATE_HABIT` on a valid submit (R7.1). Validation failures are
 * surfaced next to the relevant field without dispatching (R7.2, R7.3, R7.4).
 */
export function HabitForm(): JSX.Element {
  const { dispatch } = useApp();

  // Controlled inputs so failed submits retain what the user typed (R7.2).
  const [name, setName] = useState('');
  // Empty string is the unselected default so the missing-frequency case
  // (R7.4) can be exercised through the UI.
  const [frequency, setFrequency] = useState('');

  // Per-field error messages rendered adjacent to their inputs.
  const [nameError, setNameError] = useState<string | null>(null);
  const [frequencyError, setFrequencyError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nameResult = validateHabitName(name);
    const frequencyResult = validateTargetFrequency(
      frequency.length === 0 ? null : frequency,
    );

    // Surface (or clear) each field's error independently so both can show at
    // once when both are invalid.
    setNameError(nameResult.ok ? null : nameResult.errors[0].message);
    setFrequencyError(
      frequencyResult.ok ? null : frequencyResult.errors[0].message,
    );

    // On any failure, retain the entered values and do not dispatch (R7.2–R7.4).
    if (!nameResult.ok || !frequencyResult.ok) {
      return;
    }

    // Success: dispatch with the trimmed name and validated frequency (R7.1).
    const targetFrequency: TargetFrequency = frequencyResult.value;
    dispatch({
      type: 'CREATE_HABIT',
      input: { name: nameResult.value, targetFrequency },
    });

    // Clear the form for the next entry.
    setName('');
    setFrequency('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="habit-name">Habit name</label>
        <input
          id="habit-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={nameError !== null}
          aria-describedby={nameError !== null ? 'habit-name-error' : undefined}
        />
        {nameError !== null && (
          <p id="habit-name-error" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="habit-frequency">Target frequency</label>
        <select
          id="habit-frequency"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value)}
          aria-invalid={frequencyError !== null}
          aria-describedby={
            frequencyError !== null ? 'habit-frequency-error' : undefined
          }
        >
          <option value="">Select a frequency</option>
          <option value="daily">Daily</option>
        </select>
        {frequencyError !== null && (
          <p id="habit-frequency-error" role="alert">
            {frequencyError}
          </p>
        )}
      </div>

      <button type="submit">Add habit</button>
    </form>
  );
}
