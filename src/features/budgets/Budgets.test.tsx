import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { upsertBudget } from '../../data/repositories/budgets';
import { completeOnboarding, resetAllData } from '../../data/repositories/settings';
import {
  createTransaction,
  getAllTransactions,
} from '../../data/repositories/transactions';
import { useUIStore } from '../../hooks/useUIStore';

describe('Budgets feature (/anggaran, Summary card, Home row, crossing toast) (1.0.0 Tugas 6)', () => {
  beforeEach(async () => {
    window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    await resetAllData('2026-11-18');
    await completeOnboarding({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });
    useUIStore.setState({
      toast: null,
      isTransactionSheetOpen: false,
      editingTransactionId: null,
      mascotCelebration: null,
    });
  });

  it('validates budget sheet, excludes already-budgeted categories, sorts by ratio, and preserves transactions when deleting budget', async () => {
    const user = userEvent.setup();
    await upsertBudget({ categoryId: 'cat-makan', period: 'month', amount: 300_000 });
    await createTransaction({
      type: 'expense',
      amount: 150_000,
      categoryId: 'cat-makan',
      note: 'Nasi padang',
      date: '2026-11-18',
      source: 'quick',
    });

    window.history.pushState({}, '', '/anggaran');
    render(<App />);

    const addBtn = await screen.findByRole('button', { name: 'Atur anggaran' });
    await user.click(addBtn);

    // Makan already has a budget -> must NOT appear in create category dropdown
    const select = screen.getByLabelText('Kategori');
    expect(select).not.toHaveTextContent('Makan');

    await user.selectOptions(select, 'cat-jajan');
    const amountInput = screen.getByLabelText('Batas nominal');
    await user.type(amountInput, '500');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Rp 1\.000/);

    await user.clear(amountInput);
    await user.type(amountInput, '200rb');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      const list = screen.getByRole('list', { name: 'Daftar anggaran per kategori' });
      expect(within(list).getByText('Jajan')).toBeInTheDocument();
      expect(within(list).getByText('Sisa Rp 200rb dari Rp 200rb')).toBeInTheDocument();
    });

    // Makan (50% ratio) appears before Jajan (0% ratio)
    const items = within(
      screen.getByRole('list', { name: 'Daftar anggaran per kategori' })
    ).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Makan');
    expect(items[1]).toHaveTextContent('Jajan');

    // Open Makan -> delete budget -> transactions remain completely intact
    await user.click(items[0].querySelector('button')!);
    await user.click(screen.getByRole('button', { name: 'Hapus' }));

    await waitFor(async () => {
      expect(screen.queryByText('Sisa Rp 150rb dari Rp 300rb')).not.toBeInTheDocument();
      const txs = await getAllTransactions();
      expect(txs).toHaveLength(1);
    });
  });

  it('shows Home compact alert only when hampir/habis, fires crossing toast on new expense (not edit), and renders top 3 on Ringkasan', async () => {
    const user = userEvent.setup();
    await upsertBudget({ categoryId: 'cat-jajan', period: 'month', amount: 100_000 });
    await createTransaction({
      type: 'expense',
      amount: 50_000,
      categoryId: 'cat-jajan',
      note: 'Kopi awal',
      date: '2026-11-18',
      source: 'quick',
    });

    window.history.pushState({}, '', '/');
    render(<App />);

    // 50rb / 100rb -> aman -> Home budget row must NOT render
    await waitFor(() => {
      expect(screen.getByTestId('hero-allowance-amount')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('home-budget-alert')).not.toBeInTheDocument();

    // Quick-add "kopi 10rb" (now 60rb) + tap Kopi template 12rb? Let's quick-add "kopi 35rb" -> 85rb (remaining 15rb)
    const input = screen.getByPlaceholderText('Ketik: kopi 18rb');
    await user.type(input, 'kopi 35rb');
    await user.click(screen.getByRole('button', { name: 'Simpan catatan cepat' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Anggaran Jajan tinggal Rp 15rb.'
      );
      expect(screen.getByTestId('home-budget-alert')).toHaveTextContent(
        'Jajan hampir habis'
      );
    });

    // Save via Template chip "Kopi 12rb" -> total 97rb (still hampir -> no crossing)
    // Add another quick-add "kopi 8rb" -> total 105rb (lewat Rp 5rb -> habis toast)
    await user.type(input, 'kopi 20rb');
    await user.click(screen.getByRole('button', { name: 'Simpan catatan cepat' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Anggaran Jajan sudah lewat Rp 5rb. Tidak apa-apa, kita pantau.'
      );
      expect(screen.getByTestId('home-budget-alert')).toHaveTextContent(
        'Jajan lewat Rp 5rb'
      );
    });

    // Editing a transaction MUST NOT fire budget crossing toast
    await user.click(screen.getByText('Kopi awal'));
    const noteInput = await screen.findByLabelText(/Catatan \(opsional/i);
    await user.clear(noteInput);
    await user.type(noteInput, 'Kopi susu edited');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Diperbarui · Kopi susu edited'
      );
      expect(screen.getByRole('status')).not.toHaveTextContent(/Anggaran Jajan/);
    });

    // SummaryPage shows Anggaran card
    await user.click(screen.getByRole('link', { name: 'Ringkasan' }));
    await waitFor(() => {
      expect(screen.getByTestId('summary-budgets-card')).toHaveTextContent(
        'Lewat Rp 5rb dari anggaran'
      );
    });
  });
});
