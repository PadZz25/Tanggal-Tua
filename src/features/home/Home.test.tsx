import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { Toast } from '../../components/ui/Toast';
import {
  completeOnboarding,
  resetAllData,
  updateSettings,
} from '../../data/repositories/settings';
import {
  createTransaction,
  getAllTransactions,
} from '../../data/repositories/transactions';
import { clearDismissedReminderDate } from '../../domain/reminder';
import { getHomeState } from '../../domain/allowance';
import { DEFAULT_CATEGORIES } from '../../domain/parser/keywords';
import { useUIStore } from '../../hooks/useUIStore';
import { Mascot } from '../../components/brand/Mascot';
import { HeroCard } from './HeroCard';
import { QuickAddBar } from './QuickAddBar';

describe('Home features & components (Milestone M3 & 0.3.0 Tugas 1)', () => {
  beforeEach(async () => {
    window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    delete window.__TANGGAL_TUA_NOW_MINUTES__;
    clearDismissedReminderDate();
    await resetAllData('2026-11-18');
    useUIStore.setState({
      toast: null,
      isTransactionSheetOpen: false,
      editingTransactionId: null,
      mascotCelebration: null,
      paydayRolledBanner: false,
    });
  });

  it('renders HeroCard with "Sisa uang" total balance across normal, fresh, tanggal-tua, over, broke (negative), and payday-needed states', () => {
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
    expect(screen.getByTestId('hero-allowance-amount')).not.toHaveClass('tabular-nums');
    expect(screen.getByText(/dari jatah Rp 65rb/i)).toBeInTheDocument();
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Sisa uang');
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 816.000');
    expect(screen.getByText('Sisa uang 816 ribu rupiah')).toBeInTheDocument();

    // 2. Fresh state
    const freshState = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 845_000,
      spentToday: 0,
    });
    rerender(
      <HeroCard
        today="2026-11-18"
        nextPayday="2026-12-01"
        homeState={freshState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 845.000');
    expect(screen.getByText('Sisa uang 845 ribu rupiah')).toBeInTheDocument();

    // 3. Tanggal Tua state
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
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 166.000');

    // 4. Over state
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
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 148.000');

    // 5. Broke state with negative balance (U+2212 minus)
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
    expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('−Rp 20.000');
    expect(screen.getByText('Sisa uang minus 20 ribu rupiah')).toBeInTheDocument();

    // 6. Payday-needed state (consistent, no duplicate hero-total-balance row)
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
    expect(screen.getByTestId('hero-balance-amount')).toHaveTextContent('Rp 350.000');
    expect(screen.queryByTestId('hero-total-balance')).not.toBeInTheDocument();

    // 7. Decimal comma hero values ("Rp 65,4rb" & "Rp 1,5jt") preserve exact text with proportional-nums
    const decimalState = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-12-01',
      currentBalance: 850_000,
      spentToday: 0,
    });
    rerender(
      <HeroCard
        today="2026-11-18"
        nextPayday="2026-12-01"
        homeState={decimalState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('Rp 65,4rb');

    const millionState = getHomeState({
      today: '2026-11-18',
      nextPayday: '2026-11-19',
      currentBalance: 1_500_000,
      spentToday: 0,
    });
    rerender(
      <HeroCard
        today="2026-11-18"
        nextPayday="2026-11-19"
        homeState={millionState}
        onConfigurePayday={noop}
        onRecordIncome={noop}
      />
    );
    expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('Rp 1,5jt');
  });

  it('updates "Sisa uang" in real time when adding and undoing a transaction on Beranda', async () => {
    const user = userEvent.setup();
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 845.000');
    });

    const input = screen.getByPlaceholderText('Ketik: kopi 18rb');
    await user.type(input, 'kopi 18rb');
    await user.click(screen.getByRole('button', { name: 'Simpan catatan cepat' }));

    await waitFor(() => {
      expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 827.000');
    });

    await user.click(screen.getByRole('button', { name: 'Batalkan' }));

    await waitFor(() => {
      expect(screen.getByTestId('hero-total-balance')).toHaveTextContent('Rp 845.000');
    });
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

    await user.type(input, 'kopi');
    await user.click(submitBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('Tambah nominal, mis. 10rb');

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

    const undoBtn = screen.getByRole('button', { name: 'Batalkan' });
    await user.click(undoBtn);

    await waitFor(async () => {
      const txs = await getAllTransactions();
      expect(txs).toHaveLength(0);
    });
  });

  it('keeps BottomNav visible when QuickAddBar input is focused without viewport shrink', async () => {
    const user = userEvent.setup();
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    const nav = await screen.findByRole('navigation', { name: 'Navigasi utama' });
    const input = screen.getByPlaceholderText('Ketik: kopi 18rb');

    await user.click(input);
    expect(document.activeElement).toBe(input);
    expect(nav).toHaveAttribute('data-nav-hidden', 'false');
    expect(nav).not.toHaveClass('translate-y-full');
    expect(nav).not.toHaveClass('invisible');
  });

  it('opens StreakSheet from streak pill, marks no-spend day with undo, and celebrates milestone 3 once with cheer mascot', async () => {
    const user = userEvent.setup();
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-16',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });

    await createTransaction({
      type: 'expense',
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Hari 1',
      date: '2026-11-16',
      source: 'quick',
    });
    await createTransaction({
      type: 'expense',
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Hari 2',
      date: '2026-11-17',
      source: 'quick',
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    const pill = await screen.findByTestId('streak-pill');
    expect(pill).toHaveTextContent('2 hari');

    // Open StreakSheet and mark today as no_spend -> reaches streak 3 milestone!
    await user.click(pill);
    expect(screen.getByRole('heading', { name: 'Streak Mencatat' })).toBeInTheDocument();
    expect(screen.getAllByText(/tercatat/i).length).toBeGreaterThanOrEqual(14);

    await user.click(screen.getByRole('button', { name: 'Hari ini tidak ada pengeluaran' }));

    await waitFor(() => {
      expect(screen.getByTestId('streak-pill')).toHaveTextContent('3 hari');
      expect(screen.getByRole('status')).toHaveTextContent(
        'Keren! Streak 3 hari berturut-turut.'
      );
      expect(screen.getByTestId('mascot-message')).toHaveTextContent(
        'Keren! Streak 3 hari berturut-turut terjaga.'
      );
    });

    // Re-open StreakSheet -> no_spend button is disabled because today is already logged
    await user.click(screen.getByTestId('streak-pill'));
    expect(
      screen.getByRole('button', { name: 'Hari ini tidak ada pengeluaran' })
    ).toBeDisabled();

    // Render Mascot cheer & wink SVG expressions cleanly
    const { container } = render(
      <>
        <Mascot mood="cheer" />
        <Mascot mood="wink" />
      </>
    );
    expect(container.querySelector('[data-mood="cheer"]')).toBeInTheDocument();
    expect(container.querySelector('[data-mood="wink"]')).toBeInTheDocument();
  });

  it('shows daily reminder banner when enabled & past time, focuses input, marks no-spend, dismisses until next day, and handles ?aksi=catat', async () => {
    const user = userEvent.setup();
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-10',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });
    await updateSettings({ reminderEnabled: true, reminderTime: '20:00' });
    window.__TANGGAL_TUA_NOW_MINUTES__ = 20 * 60 + 15;

    window.history.pushState({}, '', '/');
    const { unmount } = render(<App />);

    const banner = await screen.findByTestId('home-reminder-banner');
    expect(banner).toHaveTextContent('Sudah catat jajan hari ini?');

    await user.click(within(banner).getByRole('button', { name: 'Catat' }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Ketik: kopi 18rb'));

    // Dismiss hides reminder for today
    await user.click(screen.getByRole('button', { name: 'Tutup pengingat hari ini' }));
    await waitFor(() => {
      expect(screen.queryByTestId('home-reminder-banner')).not.toBeInTheDocument();
    });

    // Next day reminder shows again and can mark no-spend day
    unmount();
    window.__TANGGAL_TUA_TODAY__ = '2026-11-19';
    window.history.pushState({}, '', '/?aksi=catat');
    const second = render(<App />);

    const nextBanner = await screen.findByTestId('home-reminder-banner');
    expect(window.location.search).toBe('');
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Ketik: kopi 18rb'));

    await user.click(
      within(nextBanner).getByRole('button', { name: 'Hari ini tidak ada pengeluaran' })
    );
    await waitFor(() => {
      expect(screen.queryByTestId('home-reminder-banner')).not.toBeInTheDocument();
    });
    second.unmount();
  });

  it('enforces single-banner priority, snoozes & downloads backup JSON, and shows dismissible iOS Safari guide', async () => {
    const user = userEvent.setup();
    const origCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const origRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-backup'),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
    const uaSpy = vi
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
      );

    try {
      await completeOnboarding({
        openingBalance: 1_500_000,
        openingDate: '2026-11-01',
        nextPayday: '2026-12-01',
        paydayDay: 1,
        theme: 'light',
      });

      for (let i = 1; i <= 10; i++) {
        await createTransaction({
          type: 'expense',
          amount: 10_000,
          categoryId: 'cat-makan',
          note: `Makan ${i}`,
          date: '2026-11-18',
          source: 'quick',
        });
      }

      window.history.pushState({}, '', '/');
      const { unmount } = render(<App />);

      // iOS install guide beats backup banner (payday > reminder > budget > ios-install > backup)
      const iosBanner = await screen.findByTestId('home-ios-install-banner');
      expect(iosBanner).toHaveTextContent('Pasang ke Layar Utama');
      expect(screen.queryByTestId('home-backup-banner')).not.toBeInTheDocument();

      // Dismiss iOS guide -> backup banner immediately surfaces alone
      await user.click(screen.getByRole('button', { name: 'Tutup panduan instal iPhone' }));
      await screen.findByTestId('home-backup-banner');
      expect(screen.queryByTestId('home-ios-install-banner')).not.toBeInTheDocument();

      // Payday rolled banner preempts backup banner strictly (only one banner rendered)
      act(() => {
        useUIStore.getState().setPaydayRolledBanner(true);
      });
      await waitFor(() => {
        expect(screen.getByText(/Kiriman sudah masuk\?/)).toBeInTheDocument();
        expect(screen.queryByTestId('home-backup-banner')).not.toBeInTheDocument();
      });
      act(() => {
        useUIStore.getState().setPaydayRolledBanner(false);
      });
      await waitFor(() => {
        expect(screen.getByTestId('home-backup-banner')).toBeInTheDocument();
      });

      // Snooze hides backup banner for 7 days
      await user.click(
        within(screen.getByTestId('home-backup-banner')).getByRole('button', {
          name: 'Nanti',
        })
      );
      await waitFor(() => {
        expect(screen.queryByTestId('home-backup-banner')).not.toBeInTheDocument();
      });

      // Advancing 7 days resurfaces backup banner; downloading clears it permanently for 30 days
      unmount();
      window.__TANGGAL_TUA_TODAY__ = '2026-11-25';
      render(<App />);
      const resurfaced = await screen.findByTestId('home-backup-banner');
      await user.click(within(resurfaced).getByRole('button', { name: 'Unduh cadangan' }));
      await waitFor(() => {
        expect(screen.queryByTestId('home-backup-banner')).not.toBeInTheDocument();
      });
    } finally {
      uaSpy.mockRestore();
      if (origCreateObjectUrl) {
        Object.defineProperty(URL, 'createObjectURL', origCreateObjectUrl);
      } else {
        delete (URL as { createObjectURL?: unknown }).createObjectURL;
      }
      if (origRevokeObjectUrl) {
        Object.defineProperty(URL, 'revokeObjectURL', origRevokeObjectUrl);
      } else {
        delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
      }
    }
  });
});
