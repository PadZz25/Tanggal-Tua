import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { completeOnboarding, resetAllData } from '../data/repositories/settings';
import { App, APP_NAME } from './App';

describe('App router & onboarding guard', () => {
  beforeEach(async () => {
    await resetAllData('2026-11-18');
    window.history.pushState({}, '', '/');
  });

  it('redirects un-onboarded user to /onboarding step 1', async () => {
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /Uang yang kamu pegang sekarang berapa\?/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders Beranda with HeroCard when user has onboarded', async () => {
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(APP_NAME)).toBeInTheDocument();
      expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('Rp 65rb');
    });
  });
});
