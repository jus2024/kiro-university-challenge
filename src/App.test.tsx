import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App (smoke test)', () => {
  it('renders the placeholder heading, confirming the toolchain runs', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /task & habit tracker/i }),
    ).toBeInTheDocument();
  });
});
