import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '../../components/ui/Toast';
import { resetAllData } from '../../data/repositories/settings';
import { getAllTransactions } from '../../data/repositories/transactions';
import { getHomeState } from '../../domain/allowance';
import { DEFAULT_CATEGORIES } from '../../domain/parser/keywords';
import { useUIStore } from '../../hooks/useUIStore';
import { HeroCard } from './HeroCard';
import { QuickAddBar } from './QuickAddBar';

describe('Home features & components (Milestone M3)', () => {
  beforeEach(async () => {
    await resetAllData('2026-11-18');
    useUIStore.setState({
      toast: null,
      pendingDeleteIds: [],
      isTransactionSheetOpen: false,
      editingTransactionId: null,
      isQuickInputFocused: false,
      paydayRolledBanner: false,
    });
  });

  it('renders HeroCard in normal, tanggal-tua, over, broke, and payday-needed states', () => {
    const noop = vi.fn();

    // 1. Normal state
    const normalState = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 816_000,
      spentToday: 29_000,
    });
    const { rerender } = render(
      <HeroCard
        today="2026-11-18"
        nextPayday="2026-12-01"
        homeState={normalState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByText('Jatah hari ini')).toBeInTheDocument();
    expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('Rp 36rb');
    expect(screen.getByText(/dari jatah Rp 65rb/i)).toBeInTheDocument();

    // 2. Tanggal Tua state
    const tanggalTuaState = getHomeState({
      today: '2026-11-27',
      nextPayday: '2026-12-01',
      currentBalance: 166_000,
      spentToday: 42_000,
    });
    rerender(
      <HeroCard
        today="2026-11-27"
        nextPayday="2026-12-01"
        homeState={tanggalTuaState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByText('Mode Tanggal Tua')).toBeInTheDocument();
    expect(screen.getByText('1 Des · 4 hari lagi')).toBeInTheDocument();

    // 3. Over state
    const overState = getHomeState({
      today: '2026-11-27',
      nextPayday: '2026-12-01',
      currentBalance: 148_000,
      spentToday: 60_000,
    });
    rerender(
      <HeroCard
        today="2026-11-27"
        nextPayday="2026-12-01"
        homeState={overState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('−Rp 8rb');

    // 4. Broke state
    const brokeState = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: -20_000,
      spentToday: 0,
    });
    rerender(
      <HeroCard
        today="2026-11-18"
        nextPayday="2026-12-01"
        homeState={brokeState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByRole('button', { name: 'Catat pemasukan' })).toBeInTheDocument();

    // 5. Payday-needed state
    const paydayNeededState = getHomeState({
      today: '2026-12-01',
      nextPayday: '2026-12-01',
      currentBalance: 350_000,
      spentToday: 0,
    });
    rerender(
      <HeroCard
        today="2026-12-01"
        nextPayday="2026-12-01"
        homeState={paydayNeededState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Atur kiriman berikutnya' })
    ).toBeInTheDocument();
  });

  it('validates QuickAddBar input, saves transaction, and allows undo via Toast Batalkan', async () => {
    const user = userEvent.setup();
    const categoryMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c]));

    render(
      <MemoryRouter>
        <QuickAddBar
          today="2026-11-18"
          openingDate="2026-11-01"
          categories={DEFAULT_CATEGORIES}
          categoryMap={categoryMap}
        />
        <Toast />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Ketik: kopi 18rb');
    const submitBtn = screen.getByRole('button', { name: 'Simpan catatan cepat' });

    // Submit without amount -> shows inline error hint
    await user.type(input, 'kopi');
    await user.click(submitBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Tambah nominal, mis. 10rb');

    // Type valid quick add -> saves and shows toast with Batalkan
    await user.clear(input);
    await user.type(input, 'kopi 18rb');
    await user.click(submitBtn);

    await waitFor(async () => {
      const txs = await getAllTransactions();
      expect(txs).toHaveLength(1);
      expect(txs[0].note).toBe('Kopi');
      expect(txs[0].amount).toBe(18_000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Tersimpan · Kopi −18rb');

    // Click Batalkan -> deletes transaction
    const undoBtn = screen.getByRole('button', { name: 'Batalkan' });
    await user.click(undoBtn);

    await waitFor(async () => {
      const txs = await getAllTransactions();
      expect(txs).toHaveLength(0);
    });
  });
});
