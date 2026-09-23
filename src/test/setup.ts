import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import fc from 'fast-check';

// Ensure every property-based test runs a meaningful number of iterations.
fc.configureGlobal({ numRuns: 100 });

// Clean up the DOM after each test to keep component tests isolated.
afterEach(() => {
  cleanup();
});
