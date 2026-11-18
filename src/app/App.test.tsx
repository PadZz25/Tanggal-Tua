import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App, APP_NAME } from './App';

describe('App foundation (M0)', () => {
  it('renders application title and tagline', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument();
    expect(screen.getByText('Bertahan sampai kiriman berikutnya.')).toBeInTheDocument();
  });
});
