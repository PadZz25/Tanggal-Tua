import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import {
  completeGoalWithPurchase,
  createGoal,
  deleteGoalTransaction,
  depositToGoal,
  getAllGoals,
  withdrawFromGoal,
} from '../../data/repositories/goals';
import { completeOnboarding, resetAllData } from '../../data/repositories/settings';
import { getAllTransactions } from '../../data/repositories/transactions';
import { SYSTEM_CATEGORY_WITHDRAW_ID } from '../../domain/parser/keywords';
import { computeGoalSaved } from '../../domain/savings';
import { useUIStore } from '../../hooks/useUIStore';

describe('Goals feature (/target, /target/:id, Home row) (1.0.0 Tugas 5)', () => {
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

  it('enforces form validation, max 3 active goals limit, and delete protection', async () => {
    await expect(
      createGoal({
        name: 'Terlalu kecil',
        targetAmount: 5_000,
        today: '2026-11-18',
        deadline: '2026-12-20',
      })
    ).rejects.toThrow();

    await expect(
      createGoal({
        name: 'Tanggal lewat',
        targetAmount: 100_000,
        today: '2026-11-18',
        deadline: '2026-11-18',
      })
    ).rejects.toThrow();

    const g1 = await createGoal({
      name: 'Target 1',
      targetAmount: 200_000,
      today: '2026-11-18',
      deadline: '2026-12-20',
    });
    await createGoal({
      name: 'Target 2',
      targetAmount: 300_000,
      today: '2026-11-18',
      deadline: '2026-12-25',
    });
    await createGoal({
      name: 'Target 3',
      targetAmount: 400_000,
      today: '2026-11-18',
      deadline: '2026-12-28',
    });

    await expect(
      createGoal({
        name: 'Target 4',
        targetAmount: 500_000,
        today: '2026-11-18',
        deadline: '2026-12-30',
      })
    ).rejects.toThrow(/Maksimal 3 target aktif/i);

    const dep = await depositToGoal({
      goalId: g1.id,
      amount: 100_000,
      date: '2026-11-18',
      currentBalance: 845_000,
    });
    expect(dep.milestoneReached).toBe(50);

    await withdrawFromGoal({
      goalId: g1.id,
      amount: 60_000,
      date: '2026-11-18',
    });

    // Deleting the 100rb deposit while a 60rb withdrawal exists would drop saved to -60rb -> rejected
    await expect(
      deleteGoalTransaction(g1.id, dep.transaction.id)
    ).rejects.toThrow();
  });

  it('creates goal via UI, shows Home compact row, previews allowance on Sisihkan, completes, and archives with refund', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/target');
    render(<App />);

    const createBtn = await screen.findByRole('button', { name: 'Buat target pertama' });
    await user.click(createBtn);

    await user.type(screen.getByLabelText('Nama target'), 'Monitor kerja');
    await user.type(screen.getByLabelText(/Nominal target/i), '400rb');
    await user.clear(screen.getByLabelText('Tanggal target tercapai'));
    await user.type(screen.getByLabelText('Tanggal target tercapai'), '2026-11-28');
    await user.click(screen.getByRole('button', { name: 'Simpan target' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Monitor kerja' })).toBeInTheDocument();
    });

    // Open Sisihkan sheet -> check live preview
    await user.click(screen.getByRole('button', { name: 'Sisihkan' }));
    const depositInput = screen.getByLabelText('Nominal yang disisihkan');
    await user.clear(depositInput);
    await user.type(depositInput, '130rb');
    expect(screen.getByTestId('goal-deposit-preview')).toHaveTextContent(
      'Jatah hari ini jadi Rp 55rb (dari Rp 65rb)'
    );

    await user.click(screen.getByRole('button', { name: 'Simpan setoran' }));

    await waitFor(() => {
      // 130rb of 400rb = 32% -> crosses 25% milestone once
      expect(screen.getByRole('status')).toHaveTextContent('25%');
      expect(screen.getByText('Rp 130.000')).toBeInTheDocument();
    });

    // Navigate to Beranda -> compact goal row shows & hero allowance updated to Rp 55rb
    await user.click(screen.getByRole('link', { name: 'Beranda' }));
    await waitFor(() => {
      expect(screen.getByTestId('hero-allowance-amount')).toHaveTextContent('Rp 55rb');
      expect(screen.getByTestId('home-goal-row')).toHaveTextContent(
        'Monitor kerja'
      );
      expect(screen.getByTestId('home-goal-row')).toHaveTextContent(
        'Rp 130rb dari Rp 400rb'
      );
    });

    // Open goal detail via Home row -> Archive -> refunds 130rb back into balance via Tarik tabungan
    await user.click(screen.getByTestId('home-goal-row'));
    const archiveBtn = await screen.findByRole('button', { name: 'Arsipkan' });
    await user.click(archiveBtn);
    expect(
      screen.getByText(/Rp 130\.000 akan dikembalikan ke saldomu/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ya, arsipkan' }));

    await waitFor(async () => {
      const goals = await getAllGoals();
      expect(goals[0].status).toBe('archived');
      const txs = await getAllTransactions();
      expect(
        txs.some(
          (t) =>
            t.categoryId === SYSTEM_CATEGORY_WITHDRAW_ID && t.amount === 130_000
        )
      ).toBe(true);
      expect(computeGoalSaved(txs, goals[0].id)).toBe(0);
    });

    // Also verify completeGoalWithPurchase sets completed WITHOUT creating transactions
    const g2 = await createGoal({
      name: 'Headset',
      targetAmount: 200_000,
      today: '2026-11-18',
      deadline: '2026-12-10',
    });
    await depositToGoal({
      goalId: g2.id,
      amount: 200_000,
      date: '2026-11-18',
      currentBalance: 845_000,
    });
    const txCountBeforeComplete = (await getAllTransactions()).length;
    await completeGoalWithPurchase(g2.id);
    const txCountAfterComplete = (await getAllTransactions()).length;
    expect(txCountAfterComplete).toBe(txCountBeforeComplete);
  });
});
