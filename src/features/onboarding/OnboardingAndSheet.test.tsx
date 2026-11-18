import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, resetAllData } from '../../data/repositories/settings';
import { getAllTransactions } from '../../data/repositories/transactions';
import { DEFAULT_CATEGORIES } from '../../domain/parser/keywords';
import { useUIStore } from '../../hooks/useUIStore';
import { TransactionSheet } from '../transactions/TransactionSheet';
import { OnboardingPage } from './OnboardingPage';

describe('Onboarding & TransactionSheet (Milestone M4)', () => {
  beforeEach(async () => {
    await resetAllData('2026-11-18');
    useUIStore.setState({
      toast: null,
      pendingDeleteIds: [],
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
});
