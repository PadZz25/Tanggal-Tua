import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { completeOnboarding, resetAllData } from '../../data/repositories/settings';
import { createTransaction } from '../../data/repositories/transactions';
import { getHomeState } from '../../domain/allowance';
import { DEFAULT_CATEGORIES } from '../../domain/parser/keywords';
import type { AppLiveState } from '../../hooks/useHomeState';
import { SummaryPage } from './SummaryPage';

function makeMockLive(overrides: Partial<AppLiveState> = {}): AppLiveState {
  const categoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));
  return {
    isLoading: false,
    error: null,
    today: '2026-11-18',
    settings: {
      id: 'main',
      schemaVersion: 2,
      hasOnboarded: true,
      openingBalance: 845_000,
      openingDate: '2026-11-16',
      nextPayday: '2026-12-01',
      paydayRepeat: 'monthly',
      paydayDay: 1,
      paydayWeekday: null,
      tanggalTuaThreshold: 30_000,
      theme: 'light',
      lastExportAt: null,
      reminderEnabled: false,
      reminderTime: '20:00',
      lastCelebratedStreak: 0,
      backupSnoozeUntil: null,
      iosHintDismissed: false,
    },
    categories: DEFAULT_CATEGORIES,
    categoryMap,
    templates: [],
    topTemplates: [],
    transactions: [],
    todayTransactions: [],
    goals: [],
    dayMarks: [],
    budgets: [],
    homeState: getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 845_000,
      spentToday: 0,
    }),
    ...overrides,
  };
}

describe('SummaryPage & History query filters (0.3.0 Tugas 3)', () => {
  beforeEach(async () => {
    window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    await resetAllData('2026-11-18');
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-01',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });
  });

  it('renders empty state, income-only state, and error state cleanly', () => {
    // Empty state
    const { rerender } = render(
      <MemoryRouter initialEntries={['/ringkasan']}>
        <SummaryPage live={makeMockLive({ transactions: [] })} />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Belum ada catatan di periode ini. Yuk catat dulu.')
    ).toBeInTheDocument();

    // Income-only state
    rerender(
      <MemoryRouter initialEntries={['/ringkasan']}>
        <SummaryPage
          live={makeMockLive({
            transactions: [
              {
                id: 'inc-1',
                type: 'income',
                amount: 500_000,
                categoryId: 'cat-kiriman-ortu',
                goalId: null,
                note: 'Kiriman',
                date: '2026-11-18',
                occurredAt: '2026-11-18T08:00:00.000Z',
                source: 'quick',
                createdAt: '2026-11-18T08:00:00.000Z',
                updatedAt: '2026-11-18T08:00:00.000Z',
              },
            ],
          })}
        />
      </MemoryRouter>
    );
    expect(screen.getByTestId('summary-total-income')).toHaveTextContent('Rp 500.000');
    expect(screen.getByText('Belum ada pengeluaran')).toBeInTheDocument();

    // Error state
    rerender(
      <MemoryRouter initialEntries={['/ringkasan']}>
        <SummaryPage live={makeMockLive({ error: 'DB gagal dibuka' })} />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Gagal memuat' })).toBeInTheDocument();
  });

  it('disables next button on current period and disables previous button at openingDate boundary', () => {
    render(
      <MemoryRouter initialEntries={['/ringkasan']}>
        <SummaryPage
          live={makeMockLive({
            settings: {
              ...makeMockLive().settings,
              openingDate: '2026-11-16',
            },
          })}
        />
      </MemoryRouter>
    );

    // Current week is 16-22 Nov; prev week ends 15 Nov < openingDate (16 Nov)
    expect(screen.getByRole('button', { name: 'Periode berikutnya' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Periode sebelumnya' })).toBeDisabled();
  });

  it('renders donut aria-label, interactive daily bars, links legend to filtered Riwayat, and removes filter chip', async () => {
    const user = userEvent.setup();

    await createTransaction({
      type: 'expense',
      amount: 60_000,
      categoryId: 'cat-makan',
      note: 'Nasi padang',
      date: '2026-11-18',
      source: 'quick',
    });
    await createTransaction({
      type: 'expense',
      amount: 40_000,
      categoryId: 'cat-jajan',
      note: 'Kopi susu',
      date: '2026-11-17',
      source: 'quick',
    });

    window.history.pushState({}, '', '/ringkasan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
      expect(screen.getByTestId('summary-total-expense')).toHaveTextContent('Rp 100.000');
    });

    // Donut aria-label contains period & category percentages summing to 100
    const donut = screen.getByRole('img', {
      name: /Pengeluaran 16–22 Nov: Makan 60%, Jajan 40%/i,
    });
    expect(donut).toBeInTheDocument();

    // Tap Tuesday bar -> updates daily chart caption
    const tuesdayBar = screen.getByRole('button', { name: /Selasa, 17 Nov/i });
    await user.click(tuesdayBar);
    expect(screen.getByTestId('daily-chart-caption')).toHaveTextContent(
      'Selasa, 17 Nov · Rp 40rb'
    );

    // Click Makan legend link -> navigates to filtered /riwayat
    const makanLink = screen.getByRole('link', { name: /Makan/i });
    expect(makanLink).toHaveAttribute(
      'href',
      '/riwayat?kategori=cat-makan&dari=2026-11-16&sampai=2026-11-22'
    );

    await user.click(makanLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Riwayat' })).toBeInTheDocument();
      expect(screen.getByText('Nasi padang')).toBeInTheDocument();
      expect(screen.queryByText('Kopi susu')).not.toBeInTheDocument();
    });

    const filterChip = screen.getByTestId('history-filter-chip');
    expect(filterChip).toHaveTextContent('Makan · 16–22 Nov');

    // Remove filter chip -> Kopi susu reappears
    await user.click(filterChip);
    await waitFor(() => {
      expect(screen.queryByTestId('history-filter-chip')).not.toBeInTheDocument();
      expect(screen.getByText('Kopi susu')).toBeInTheDocument();
      expect(screen.getByText('Nasi padang')).toBeInTheDocument();
    });
  });

  it('matches null-category expenses under Lainnya when navigating from SummaryPage donut to Riwayat', async () => {
    const user = userEvent.setup();
    await createTransaction({
      type: 'expense',
      amount: 25_000,
      categoryId: null,
      note: 'Tanpa kategori',
      date: '2026-11-18',
      source: 'form',
    });

    window.history.pushState({}, '', '/ringkasan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('summary-total-expense')).toHaveTextContent('Rp 25.000');
    });

    await user.click(screen.getByRole('link', { name: /Lainnya/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Riwayat' })).toBeInTheDocument();
      expect(screen.getByText('Tanpa kategori')).toBeInTheDocument();
    });
  });

  it('displays "Ditabung Rp X" row without counting goal transactions as expense/income', () => {
    render(
      <MemoryRouter initialEntries={['/ringkasan']}>
        <SummaryPage
          live={makeMockLive({
            transactions: [
              {
                id: 'sav-1',
                type: 'expense',
                amount: 130_000,
                categoryId: 'cat-tabungan',
                goalId: 'goal-1',
                note: 'Sisihkan target',
                date: '2026-11-18',
                occurredAt: '2026-11-18T08:00:00.000Z',
                source: 'form',
                createdAt: '2026-11-18T08:00:00.000Z',
                updatedAt: '2026-11-18T08:00:00.000Z',
              },
            ],
          })}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('summary-total-expense')).toHaveTextContent('Rp 0');
    expect(screen.getByTestId('summary-saved')).toHaveTextContent('Ditabung Rp 130.000');
  });
});
