import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { completeOnboarding, resetAllData } from '../../data/repositories/settings';
import {
  createTransaction,
  getAllTransactions,
} from '../../data/repositories/transactions';
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
      pendingDeleteIds: [],
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

    // Quick delete Kopi pagi -> disappears immediately & shows Batalkan toast
    await user.click(screen.getByRole('button', { name: 'Hapus transaksi Kopi pagi' }));
    expect(screen.queryByText('Kopi pagi')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Dihapus · Kopi pagi');

    // Undo delete -> reappears
    await user.click(screen.getByRole('button', { name: 'Batalkan' }));
    expect(screen.getByText('Kopi pagi')).toBeInTheDocument();
  });

  it('creates a signed balance adjustment transaction in Pengaturan without overwriting openingBalance', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/pengaturan');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Pengaturan' })).toBeInTheDocument();
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
  });
});
