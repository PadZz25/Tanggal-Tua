import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, resetAllData } from '../../data/repositories/settings';
import {
  createTransaction,
  getAllTransactions,
} from '../../data/repositories/transactions';
import { DEFAULT_CATEGORIES } from '../../domain/parser/keywords';
import { useUIStore } from '../../hooks/useUIStore';
import { TransactionSheet } from '../transactions/TransactionSheet';
import { OnboardingPage } from './OnboardingPage';

describe('Onboarding & TransactionSheet (Milestone M4)', () => {
  beforeEach(async () => {
    await resetAllData('2026-11-18');
    useUIStore.setState({
      toast: null,
      isTransactionSheetOpen: false,
      editingTransactionId: null,
    });
  });

  it('walks through 3 onboarding steps, calculates initial daily allowance, and saves settings', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingPage today="2026-11-18" />
      </MemoryRouter>
    );

    // Step 1: Enter balance 845rb
    const balanceInput = screen.getByLabelText('Saldo saat ini');
    await user.type(balanceInput, '845rb');
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));

    // Step 2: Default nextPayday is 2026-12-01 (13 days left)
    expect(screen.getByText(/13 hari lagi dari hari ini/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));

    // Step 3: Theme selection -> click "Lihat jatah harianku"
    await user.click(screen.getByRole('button', { name: 'Lihat jatah harianku' }));

    // Step 4: Final preview shows Rp 65rb (845000 / 13 = 65000)
    expect(screen.getByTestId('onboarding-final-allowance')).toHaveTextContent('Rp 65rb');

    await user.click(screen.getByRole('button', { name: 'Mulai' }));

    await waitFor(async () => {
      const settings = await getSettings();
      expect(settings.hasOnboarded).toBe(true);
      expect(settings.openingBalance).toBe(845_000);
      expect(settings.nextPayday).toBe('2026-12-01');
    });
  });

  it('validates and saves a transaction in TransactionSheet', async () => {
    const user = userEvent.setup();
    useUIStore.setState({
      isTransactionSheetOpen: true,
      editingTransactionId: null,
      defaultTransactionType: 'expense',
    });

    render(
      <TransactionSheet
        today="2026-11-18"
        openingDate="2026-11-01"
        categories={DEFAULT_CATEGORIES}
        transactions={[]}
      />
    );

    // Submit empty amount -> shows validation alert
    await user.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Masukkan nominal antara Rp 1/i);

    // Fill amount & note
    await user.type(screen.getByLabelText('Nominal'), '25rb');
    await user.type(screen.getByLabelText(/Catatan/i), 'Ayam geprek');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(async () => {
      const all = await getAllTransactions();
      expect(all).toHaveLength(1);
      expect(all[0].amount).toBe(25_000);
      expect(all[0].note).toBe('Ayam geprek');
    });
  });

  it('supports weekly payday repeat in Onboarding step 2 with weekday chips, hidden date picker, and live preview', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingPage today="2026-11-18" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Saldo saat ini'), '210rb');
    await user.click(screen.getByRole('button', { name: 'Lanjut' }));

    // Step 2: Default mode is Tiap bulan
    expect(screen.getByRole('radio', { name: 'Tiap bulan' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByLabelText('Tanggal kiriman berikutnya')).toBeInTheDocument();

    // Switch to Tiap minggu -> date picker hidden, 7 weekday chips shown
    await user.click(screen.getByRole('radio', { name: 'Tiap minggu' }));
    expect(
      screen.queryByLabelText('Tanggal kiriman berikutnya')
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Sabtu' }));
    expect(screen.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByTestId('payday-weekly-preview')).toHaveTextContent(
      'Kiriman berikutnya: Sabtu, 21 Nov (3 hari lagi)'
    );

    await user.click(screen.getByRole('button', { name: 'Lanjut' }));
    await user.click(screen.getByRole('button', { name: 'Lihat jatah harianku' }));
    // 210rb / 3 days = Rp 70rb
    expect(screen.getByTestId('onboarding-final-allowance')).toHaveTextContent('Rp 70rb');

    await user.click(screen.getByRole('button', { name: 'Mulai' }));
    await waitFor(async () => {
      const settings = await getSettings('2026-11-18');
      expect(settings.paydayRepeat).toBe('weekly');
      expect(settings.paydayWeekday).toBe(6);
      expect(settings.paydayDay).toBeNull();
      expect(settings.nextPayday).toBe('2026-11-21');
    });
  });

  it('keeps user edits intact in TransactionSheet when transactions prop updates in the background', async () => {
    const user = userEvent.setup();
    const initialTx = {
      id: 'tx-edit-1',
      type: 'expense' as const,
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Soto lama',
      date: '2026-11-18',
      occurredAt: '2026-11-18T10:00:00.000Z',
      source: 'quick' as const,
      createdAt: '2026-11-18T10:00:00.000Z',
      updatedAt: '2026-11-18T10:00:00.000Z',
    };

    useUIStore.setState({
      isTransactionSheetOpen: true,
      editingTransactionId: 'tx-edit-1',
      defaultTransactionType: 'expense',
    });

    const { rerender } = render(
      <TransactionSheet
        today="2026-11-18"
        openingDate="2026-11-01"
        categories={DEFAULT_CATEGORIES}
        transactions={[initialTx]}
      />
    );

    const noteInput = screen.getByLabelText(/Catatan/i);
    await user.clear(noteInput);
    await user.type(noteInput, 'Soto spesial');
    expect(noteInput).toHaveValue('Soto spesial');

    // Simulate useLiveQuery returning a fresh cloned transactions array
    rerender(
      <TransactionSheet
        today="2026-11-18"
        openingDate="2026-11-01"
        categories={DEFAULT_CATEGORIES}
        transactions={[{ ...initialTx }]}
      />
    );

    expect(screen.getByLabelText(/Catatan/i)).toHaveValue('Soto spesial');
  });

  it('updates an existing transaction cleanly when submitting TransactionSheet in edit mode', async () => {
    const user = userEvent.setup();
    const existing = await createTransaction({
      type: 'expense',
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Soto awal',
      date: '2026-11-18',
      source: 'form',
    });

    useUIStore.setState({
      isTransactionSheetOpen: true,
      editingTransactionId: existing.id,
      defaultTransactionType: 'expense',
    });

    render(
      <TransactionSheet
        today="2026-11-18"
        openingDate="2026-11-01"
        categories={DEFAULT_CATEGORIES}
        transactions={[existing]}
      />
    );

    const amountField = screen.getByLabelText('Nominal');
    const noteField = screen.getByLabelText(/Catatan/i);
    await user.clear(amountField);
    await user.type(amountField, '22rb');
    await user.clear(noteField);
    await user.type(noteField, 'Soto komplit');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(async () => {
      const all = await getAllTransactions();
      expect(all).toHaveLength(1);
      expect(all[0].amount).toBe(22_000);
      expect(all[0].note).toBe('Soto komplit');
    });
  });
});
