import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import {
  completeOnboarding,
  getSettings,
  resetAllData,
} from '../../data/repositories/settings';
import {
  createTransaction,
  getAllTransactions,
} from '../../data/repositories/transactions';
import {
  SYSTEM_CATEGORY_SAVING_ID,
} from '../../domain/parser/keywords';
import { GOAL_TX_LOCKED_MESSAGE } from '../../domain/savings';
import { useUIStore } from '../../hooks/useUIStore';

describe('History & Settings pages (Milestone M5)', () => {
  beforeEach(async () => {
    window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    await resetAllData('2026-11-18');
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-10',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });
    useUIStore.setState({
      toast: null,
      isTransactionSheetOpen: false,
      editingTransactionId: null,
    });
  });

  it('groups transactions by day in Riwayat, filters by type, and supports delete with undo', async () => {
    const user = userEvent.setup();

    await createTransaction({
      type: 'expense',
      amount: 18_000,
      categoryId: 'cat-jajan',
      note: 'Kopi pagi',
      date: '2026-11-18',
      source: 'quick',
    });

    await createTransaction({
      type: 'income',
      amount: 150_000,
      categoryId: 'cat-gaji-freelance',
      note: 'Desain poster',
      date: '2026-11-17',
      source: 'form',
    });

    window.history.pushState({}, '', '/riwayat');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Riwayat' })).toBeInTheDocument();
      expect(screen.getByText('Kopi pagi')).toBeInTheDocument();
      expect(screen.getByText('Desain poster')).toBeInTheDocument();
    });

    // Filter Masuk -> only Desain poster remains visible
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(screen.queryByText('Kopi pagi')).not.toBeInTheDocument();
    expect(screen.getByText('Desain poster')).toBeInTheDocument();

    // Filter Semua -> both visible
    await user.click(screen.getByRole('button', { name: 'Semua' }));
    expect(screen.getByText('Kopi pagi')).toBeInTheDocument();

    // Quick delete Kopi pagi -> persists immediately to IndexedDB & shows Batalkan toast
    await user.click(screen.getByRole('button', { name: 'Hapus transaksi Kopi pagi' }));
    await waitFor(async () => {
      expect(screen.queryByText('Kopi pagi')).not.toBeInTheDocument();
      const remaining = await getAllTransactions();
      expect(remaining.some((t) => t.note === 'Kopi pagi')).toBe(false);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Dihapus · Kopi pagi');

    // Undo delete -> restores deleted transaction cleanly
    await user.click(screen.getByRole('button', { name: 'Batalkan' }));
    await waitFor(async () => {
      expect(screen.getByText('Kopi pagi')).toBeInTheDocument();
      const restored = await getAllTransactions();
      expect(restored.some((t) => t.note === 'Kopi pagi')).toBe(true);
    });
  });

  it('creates a signed balance adjustment transaction in Pengaturan without overwriting openingBalance', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/pengaturan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
      expect(screen.getByText(/Versi 0\.3\.1/i)).toBeInTheDocument();
    });

    const balanceInput = screen.getByLabelText('Uang nyata yang kamu pegang sekarang');
    await user.type(balanceInput, '800rb');
    await user.click(screen.getByRole('button', { name: 'Sesuaikan' }));

    await waitFor(async () => {
      const txs = await getAllTransactions();
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe('adjustment');
      expect(txs[0].amount).toBe(-45_000);
      expect(txs[0].note).toBe('Koreksi saldo');
    });

    // Simulate negative balance (-20_000) and target 1_000_000_000 -> delta exceeds MAX_AMOUNT -> shows friendly alert
    await createTransaction({
      type: 'expense',
      amount: 820_000,
      categoryId: 'cat-lainnya-expense',
      note: 'Pengeluaran besar',
      date: '2026-11-18',
      source: 'form',
    });

    const inputAgain = screen.getByLabelText('Uang nyata yang kamu pegang sekarang');
    await user.clear(inputAgain);
    await user.type(inputAgain, '1000000000');
    await user.click(screen.getByRole('button', { name: 'Sesuaikan' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/melebihi batas maksimal/i);
    });
  });

  it('synchronizes theme radiogroup aria-checked indicator with settings.theme across Gelap, Sistem, and reload (Bug A)', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/pengaturan');
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
      expect(screen.getByText(/Versi 0\.3\.1/i)).toBeInTheDocument();
    });

    const radioTerang = screen.getByRole('radio', { name: 'Terang' });
    const radioGelap = screen.getByRole('radio', { name: 'Gelap' });
    const radioSistem = screen.getByRole('radio', { name: 'Sistem' });

    // Initial state from beforeEach is 'light'
    expect(radioTerang).toHaveAttribute('aria-checked', 'true');
    expect(radioGelap).toHaveAttribute('aria-checked', 'false');
    expect(radioSistem).toHaveAttribute('aria-checked', 'false');

    // Click Gelap -> Gelap aria-checked=true, Terang false, dataset.theme === 'dark'
    await user.click(radioGelap);
    await waitFor(() => {
      expect(radioGelap).toHaveAttribute('aria-checked', 'true');
      expect(radioTerang).toHaveAttribute('aria-checked', 'false');
      expect(radioSistem).toHaveAttribute('aria-checked', 'false');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    // Simulate reload (unmount and mount fresh App reading from Dexie)
    unmount();
    window.history.pushState({}, '', '/pengaturan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Gelap' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('radio', { name: 'Terang' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    // Switch to Sistem -> Sistem is marked aria-checked=true (not its resolved light/dark value)
    await user.click(screen.getByRole('radio', { name: 'Sistem' }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Sistem' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('radio', { name: 'Gelap' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByRole('radio', { name: 'Terang' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });
  });

  it('switches Kiriman repeat schedule to weekly, shows weekday chips & preview, and syncs indicator across reload', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/pengaturan');
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
    });

    // Initial onboarding had paydayDay=1 -> Tiap bulan checked
    expect(screen.getByRole('radio', { name: 'Tiap bulan' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByLabelText('Tanggal kiriman atau gajian')).toBeInTheDocument();

    // Switch to Tiap minggu -> date input hidden, weekday chips appear
    await user.click(screen.getByRole('radio', { name: 'Tiap minggu' }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Tiap minggu' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(
        screen.queryByLabelText('Tanggal kiriman atau gajian')
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: 'Sabtu' }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('payday-weekly-preview')).toHaveTextContent(
        'Kiriman berikutnya: Sabtu, 21 Nov (3 hari lagi)'
      );
    });

    // Switch briefly to Tidak, verify date input shows & marker updates
    await user.click(screen.getByRole('radio', { name: 'Tidak' }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Tidak' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByLabelText('Tanggal kiriman atau gajian')).toBeInTheDocument();
    });

    // Back to Tiap minggu + Sabtu then simulate full reload
    await user.click(screen.getByRole('radio', { name: 'Tiap minggu' }));
    const saturdayChip = await screen.findByRole('radio', { name: 'Sabtu' });
    await user.click(saturdayChip);
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    unmount();
    window.history.pushState({}, '', '/pengaturan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Tiap minggu' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('payday-weekly-preview')).toHaveTextContent(
        'Kiriman berikutnya: Sabtu, 21 Nov (3 hari lagi)'
      );
    });
  });

  it('labels goal-linked transactions with Tabungan and prevents edit or delete from Riwayat', async () => {
    const user = userEvent.setup();

    await createTransaction({
      type: 'expense',
      amount: 100_000,
      categoryId: SYSTEM_CATEGORY_SAVING_ID,
      goalId: 'goal-test',
      note: 'Sisihkan laptop',
      date: '2026-11-18',
      source: 'form',
    });

    window.history.pushState({}, '', '/riwayat');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sisihkan laptop')).toBeInTheDocument();
      expect(screen.getByText('Tabungan')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Sisihkan laptop'));
    expect(screen.getByRole('status')).toHaveTextContent(GOAL_TX_LOCKED_MESSAGE);
    expect(screen.queryByRole('heading', { name: 'Ubah Transaksi' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hapus transaksi Sisihkan laptop' }));
    expect(screen.getByRole('status')).toHaveTextContent(GOAL_TX_LOCKED_MESSAGE);
    expect(await getAllTransactions()).toHaveLength(1);
  });

  it('toggles in-app reminder, updates time, and downloads .ics calendar file from Pengaturan', async () => {
    const user = userEvent.setup();
    const origCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const origRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const createObjectUrlMock = vi.fn(() => 'blob:mock-ics');
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectUrlMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectUrlMock,
      configurable: true,
      writable: true,
    });

    try {
      window.history.pushState({}, '', '/pengaturan');
      render(<App />);

      const toggle = await screen.findByRole('switch', {
        name: 'Ingatkan di dalam app',
      });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      await user.click(toggle);

      await waitFor(async () => {
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect((await getSettings()).reminderEnabled).toBe(true);
      });

      const timeInput = screen.getByLabelText('Jam pengingat') as HTMLInputElement;
      expect(timeInput.value).toBe('20:00');
      fireEvent.change(timeInput, { target: { value: '21:15' } });
      await waitFor(async () => {
        expect((await getSettings()).reminderTime).toBe('21:15');
      });

      await user.click(screen.getByRole('button', { name: 'Tambah ke kalender' }));
      expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
      const blobArg = (createObjectUrlMock.mock.calls[0] as unknown[])[0] as Blob;
      expect(blobArg.type).toContain('text/calendar');
      expect(screen.getByRole('status')).toHaveTextContent(
        'Berkas pengingat kalender (.ics) berhasil diunduh'
      );

      // Verify Settings displays last backup status and persistent storage status
      expect(screen.getByTestId('settings-last-backup')).toHaveTextContent(
        'Cadangan terakhir: Belum pernah'
      );
      expect(screen.getByTestId('settings-persistence-status')).toHaveTextContent(
        /Penyimpanan permanen: (aktif|tidak aktif)/
      );

      await user.click(screen.getByRole('button', { name: 'Export JSON (Penuh)' }));
      await waitFor(() => {
        expect(screen.getByTestId('settings-last-backup')).toHaveTextContent(
          'Cadangan terakhir: 18 Nov 2026 (hari ini)'
        );
        expect(screen.getByRole('status')).toHaveTextContent(
          'Cadangan JSON berhasil diunduh'
        );
      });
    } finally {
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
