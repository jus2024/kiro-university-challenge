// Feature: task-habit-tracker
// Property-based and unit tests for input validation
// (Tasks 4.2, 4.3, 4.4; Properties 2 and 3; Requirements 1.3, 1.4, 1.5, 3.1, 3.3, 7.3, 7.4).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateTaskTitle,
  validateDueDate,
  validateHabitName,
  validateTargetFrequency,
} from './validation';

// Arbitrary whitespace runs (spaces, tabs, newlines) used to build
// whitespace-only and padded strings.
const whitespace = fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 5 });

// Content of a chosen trimmed length whose String#length equals `len`.
// IMPORTANT: the validators bound String#length (UTF-16 code units), so the
// character pool is restricted to single-code-unit (BMP) characters — including
// non-ASCII (é, ü, 漢) — but NOT astral characters like emoji, which count as
// two code units. Astral coverage is exercised separately below where length is
// not the property under test.
function contentOfTrimmedLength(len: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom('a', 'Z', '9', 'é', 'ü', '漢', '-', '_'), {
      minLength: len,
      maxLength: len,
    })
    .map((chars) => chars.join(''));
}

describe('validateTaskTitle', () => {
  // Feature: task-habit-tracker, Property 2: Title validity governs task creation and edits
  it('Property 2: accepts trimmed length 1..200 and rejects 0 or >200', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 260 }), whitespace, whitespace, (trimmedLen, lead, trail) => {
        if (trimmedLen === 0) {
          // Empty or whitespace-only -> invalid.
          expect(validateTaskTitle(`${lead}${trail}`).ok).toBe(false);
          return;
        }
        return fc.assert(
          fc.property(contentOfTrimmedLength(trimmedLen), (core) => {
            const result = validateTaskTitle(`${lead}${core}${trail}`);
            if (trimmedLen >= 1 && trimmedLen <= 200) {
              expect(result.ok).toBe(true);
              if (result.ok) expect(result.value).toBe(core);
            } else {
              expect(result.ok).toBe(false);
            }
          }),
          { numRuns: 5 },
        );
      }),
    );
  });

  it('accepts boundary length 200 and rejects 201', () => {
    fc.assert(
      fc.property(contentOfTrimmedLength(200), (core) => {
        expect(validateTaskTitle(core).ok).toBe(true);
      }),
      { numRuns: 20 },
    );
    fc.assert(
      fc.property(contentOfTrimmedLength(201), (core) => {
        expect(validateTaskTitle(core).ok).toBe(false);
      }),
      { numRuns: 20 },
    );
  });

  it('accepts titles containing astral (emoji) characters within the length bound', () => {
    // 🙂 is two UTF-16 code units; 50 of them = length 100, well within 200.
    const title = '🙂'.repeat(50);
    const result = validateTaskTitle(title);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(title);
  });

  it('rejects empty and whitespace-only titles', () => {
    expect(validateTaskTitle('').ok).toBe(false);
    expect(validateTaskTitle('   ').ok).toBe(false);
    expect(validateTaskTitle('\t\n').ok).toBe(false);
  });

  it('returns the trimmed value on success', () => {
    expect(validateTaskTitle('  hello  ')).toEqual({ ok: true, value: 'hello' });
  });
});

describe('validateDueDate', () => {
  // Feature: task-habit-tracker, Property 3: Due-date validation accepts exactly parseable dates
  it('Property 3: accepts null and real YYYY-MM-DD dates; rejects unparseable/non-existent', () => {
    expect(validateDueDate(null).ok).toBe(true);

    const realDate = fc
      .date({ min: new Date(1900, 0, 1), max: new Date(2100, 11, 31) })
      .map((d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });

    fc.assert(
      fc.property(realDate, (key) => {
        const result = validateDueDate(key);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value).toBe(key);
      }),
    );

    const notADate = fc
      .string({ maxLength: 30 })
      .filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s.trim()) && s.trim().length > 0);

    fc.assert(
      fc.property(notADate, (raw) => {
        expect(validateDueDate(raw).ok).toBe(false);
      }),
    );
  });

  it('rejects well-formed but non-existent dates', () => {
    expect(validateDueDate('2024-02-30').ok).toBe(false);
    expect(validateDueDate('2024-13-01').ok).toBe(false);
    expect(validateDueDate('2023-02-29').ok).toBe(false);
  });

  it('accepts a real leap day', () => {
    expect(validateDueDate('2024-02-29').ok).toBe(true);
  });

  it('treats empty string as no due date', () => {
    expect(validateDueDate('')).toEqual({ ok: true, value: null });
  });
});

describe('validateHabitName', () => {
  it('accepts boundary length 100 and rejects 101', () => {
    fc.assert(
      fc.property(contentOfTrimmedLength(100), (core) => {
        expect(validateHabitName(core).ok).toBe(true);
      }),
      { numRuns: 20 },
    );
    fc.assert(
      fc.property(contentOfTrimmedLength(101), (core) => {
        expect(validateHabitName(core).ok).toBe(false);
      }),
      { numRuns: 20 },
    );
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateHabitName('').ok).toBe(false);
    expect(validateHabitName('   ').ok).toBe(false);
  });
});

describe('validateTargetFrequency', () => {
  it('accepts "daily" and rejects null/empty/unknown', () => {
    expect(validateTargetFrequency('daily')).toEqual({ ok: true, value: 'daily' });
    expect(validateTargetFrequency(null).ok).toBe(false);
    expect(validateTargetFrequency('').ok).toBe(false);
    expect(validateTargetFrequency('weekly').ok).toBe(false);
  });
});
