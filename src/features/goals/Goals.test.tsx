import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';
import { db } from '../../data/db';
import {
  archiveGoal,
  completeGoalWithPurchase,
  createGoal,
  deleteGoalPermanently,
  deleteGoalTransaction,
  depositToGoal,
  getAllGoals,
  updateGoal,
  withdrawFromGoal,
} from '../../data/repositories/goals';
import { completeOnboarding, resetAllData } from '../../data/repositories/settings';
import { getAllTransactions } from '../../data/repositories/transactions';
import { computeAllowance, computeBalances } from '../../domain/allowance';
import { SYSTEM_CATEGORY_WITHDRAW_ID } from '../../domain/parser/keywords';
import { computeGoalSaved } from '../../domain/savings';
import type { Goal } from '../../domain/types';
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

  it('edits active goal via Ubah sheet, handles overdue goals & smaller target, and updates lastMilestone cleanly without toast', async () => {
    const user = userEvent.setup();
    const goal = await createGoal({
      name: 'Laptop kuliah',
      targetAmount: 8_000_000,
      today: '2026-11-18',
      deadline: '2026-12-30',
    });
    // Deposit 2.000.000 into a goal using enough openingBalance
    await completeOnboarding({
      openingBalance: 10_000_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });
    const dep = await depositToGoal({
      goalId: goal.id,
      amount: 2_000_000,
      date: '2026-11-18',
      currentBalance: 10_000_000,
    });
    expect(dep.milestoneReached).toBe(25);
    const txsBefore = await getAllTransactions();

    // Edit to 4jt -> 50%, lastMilestone becomes 50 without toast
    const afterHalf = await updateGoal({
      goalId: goal.id,
      name: 'Laptop kerja',
      targetAmount: 4_000_000,
      deadline: '2026-12-28',
      today: '2026-11-18',
    });
    expect(afterHalf.lastMilestone).toBe(50);
    expect(useUIStore.getState().toast).toBeNull();

    // Edit to 20jt -> 10%, lastMilestone becomes 0
    const afterBig = await updateGoal({
      goalId: goal.id,
      name: 'Laptop kerja pro',
      targetAmount: 20_000_000,
      deadline: '2026-12-28',
      today: '2026-11-18',
    });
    expect(afterBig.lastMilestone).toBe(0);
    expect(await getAllTransactions()).toHaveLength(txsBefore.length);

    // Seed an overdue goal and inspect UI handling + editing smaller than saved (shows Tercapai)
    const overdueGoal: Goal = {
      id: 'goal-overdue',
      name: 'Kamera lama',
      targetAmount: 3_000_000,
      startDate: '2026-11-01',
      deadline: '2026-11-15',
      status: 'active',
      lastMilestone: 0,
      createdAt: '2026-11-01T08:00:00.000Z',
    };
    await db.goals.put(overdueGoal);
    await depositToGoal({
      goalId: overdueGoal.id,
      amount: 500_000,
      date: '2026-11-18',
      currentBalance: 8_000_000,
    });

    window.history.pushState({}, '', `/target/${overdueGoal.id}`);
    render(<App />);

    expect(
      await screen.findByText('Lewat tanggal target. Mau ubah tanggalnya?')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Saran tabungan')).not.toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: 'Ubah' });
    const deleteBtn = screen.getByRole('button', { name: 'Hapus' });
    expect(editBtn).toHaveClass('min-h-[48px]');
    expect(deleteBtn).toHaveClass('min-h-[48px]');

    await user.click(editBtn);
    const editDialog = screen.getByRole('heading', { name: 'Ubah Target Tabungan' }).closest('dialog')!;
    const nameInput = within(editDialog).getByLabelText('Nama target') as HTMLInputElement;
    const nominalInput = within(editDialog).getByLabelText(/Nominal target/i) as HTMLInputElement;
    const deadlineInput = within(editDialog).getByLabelText('Tanggal target tercapai') as HTMLInputElement;

    expect(nameInput.value).toBe('Kamera lama');
    expect(nominalInput.value).toBe('3000000');
    expect(deadlineInput.value).toBe('2026-11-15');
    expect(within(editDialog).queryByLabelText(/startDate|Tanggal mulai/i)).not.toBeInTheDocument();

    // Submitting with past deadline triggers validation error
    await user.click(within(editDialog).getByRole('button', { name: 'Simpan perubahan' }));
    expect(within(editDialog).getByRole('alert')).toHaveTextContent(
      'Tanggal target harus setelah hari ini.'
    );

    // Fix deadline and reduce target to 400rb (< 500rb saved) -> immediately shows Tercapai with no toast
    await user.clear(nameInput);
    await user.type(nameInput, 'Kamera mirrorless');
    await user.clear(nominalInput);
    await user.type(nominalInput, '400rb');
    await user.clear(deadlineInput);
    await user.type(deadlineInput, '2026-12-25');
    await user.click(within(editDialog).getByRole('button', { name: 'Simpan perubahan' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Kamera mirrorless' })).toBeInTheDocument();
      expect(screen.getByText('Tercapai')).toBeInTheDocument();
      expect(screen.getByText('Lebih cepat dari rencana')).toBeInTheDocument();
    });
    expect(useUIStore.getState().toast).toBeNull();
  });

  it('enforces all 4 delete rules, restores balance/allowance on Batalkan, frees quota, and hides completed/archived goals properly', async () => {
    const user = userEvent.setup();

    // Fill quota of 3 active goals: g1 (empty), g2 (130rb deposit), g3 (active)
    const g1 = await createGoal({
      name: 'Laptop',
      targetAmount: 1_000_000,
      today: '2026-11-18',
      deadline: '2026-12-20',
    });
    const g2 = await createGoal({
      name: 'Sepeda',
      targetAmount: 500_000,
      today: '2026-11-18',
      deadline: '2026-12-22',
    });
    const g3 = await createGoal({
      name: 'Sepatu',
      targetAmount: 200_000,
      today: '2026-11-18',
      deadline: '2026-12-25',
    });

    // Mandatory test numbers: 845.000, 13 days, 65.000 -> deposit 130.000 -> 715.000 / 55.000
    await depositToGoal({
      goalId: g2.id,
      amount: 130_000,
      date: '2026-11-18',
      currentBalance: 845_000,
    });
    let txs = await getAllTransactions();
    let balances = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: txs,
    });
    expect(balances.currentBalance).toBe(715_000);
    expect(computeAllowance({ ...balances, daysLeft: 13 }).dailyAllowance).toBe(55_000);

    // Condition 2 UI: permanent delete target with transactions
    window.history.pushState({}, '', `/target/${g2.id}`);
    const view = render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Hapus' }));
    const delDialog2 = screen.getByRole('heading', { name: 'Hapus target?' }).closest('dialog')!;
    expect(
      within(delDialog2).getByText(
        /Rp 130rb akan dikembalikan ke saldo dan semua riwayat setoran\/penarikan target ini ikut terhapus\./
      )
    ).toBeInTheDocument();
    expect(within(delDialog2).getByRole('button', { name: 'Arsipkan' })).toBeInTheDocument();

    await user.click(within(delDialog2).getByRole('button', { name: 'Hapus permanen' }));

    await waitFor(async () => {
      txs = await getAllTransactions();
      expect(txs.some((t) => t.goalId === g2.id)).toBe(false);
      expect(screen.getByRole('status')).toHaveTextContent('Target dihapus');
    });

    balances = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: await getAllTransactions(),
    });
    expect(balances.currentBalance).toBe(845_000);
    expect(balances.spentToday).toBe(0);
    expect(computeAllowance({ ...balances, daysLeft: 13 }).dailyAllowance).toBe(65_000);

    // Quota freed: creating a 3rd active goal now succeeds, or test Undo first!
    await user.click(screen.getByRole('button', { name: 'Batalkan' }));
    await waitFor(async () => {
      const restoredTxs = await getAllTransactions();
      expect(restoredTxs.some((t) => t.goalId === g2.id)).toBe(true);
    });
    balances = computeBalances({
      openingBalance: 845_000,
      openingDate: '2026-11-18',
      today: '2026-11-18',
      transactions: await getAllTransactions(),
    });
    expect(balances.currentBalance).toBe(715_000);
    expect(computeAllowance({ ...balances, daysLeft: 13 }).dailyAllowance).toBe(55_000);

    // Condition 1 UI: empty target confirmation wording and Batalkan
    view.unmount();
    window.history.pushState({}, '', `/target/${g1.id}`);
    const view1 = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Hapus' }));
    const delDialog1 = screen.getByRole('heading', { name: 'Hapus target?' }).closest('dialog')!;
    expect(
      within(delDialog1).getByText('Hapus target "Laptop"? Belum ada tabungan di target ini.')
    ).toBeInTheDocument();
    await user.click(within(delDialog1).getByRole('button', { name: 'Hapus permanen' }));
    await waitFor(async () => {
      expect((await getAllGoals()).some((g) => g.id === g1.id)).toBe(false);
    });

    // Quota is now 2/3 active -> can create a replacement active goal
    const g4 = await createGoal({
      name: 'Kuota baru',
      targetAmount: 150_000,
      today: '2026-11-18',
      deadline: '2026-12-26',
    });
    expect(g4.status).toBe('active');
    view1.unmount();

    // Condition 4: Completed goal cannot be permanently deleted, only Sembunyikan (no refund tx)
    await depositToGoal({
      goalId: g3.id,
      amount: 100_000,
      date: '2026-11-18',
      currentBalance: 715_000,
    });
    await completeGoalWithPurchase(g3.id);
    await expect(deleteGoalPermanently(g3.id)).rejects.toThrow();

    // Archiving a completed goal in repository also must NOT create refund tx
    const txsBeforeArchiveCompleted = (await getAllTransactions()).length;
    window.history.pushState({}, '', `/target/${g3.id}`);
    const viewCompleted = render(<App />);

    expect(
      await screen.findByText(
        'Target yang sudah terpakai disimpan sebagai riwayat karena uangnya sudah terpakai.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sembunyikan' }));
    await waitFor(async () => {
      const archivedGoal = (await getAllGoals()).find((g) => g.id === g3.id);
      expect(archivedGoal?.status).toBe('archived');
      expect(await getAllTransactions()).toHaveLength(txsBeforeArchiveCompleted);
    });

    // Condition 3 & "Lihat arsip": archived goal hidden from main list until "Lihat arsip" clicked
    expect(screen.queryByText('Sepatu')).not.toBeInTheDocument();
    const viewArchiveBtn = await screen.findByRole('button', { name: /Lihat arsip/i });
    await user.click(viewArchiveBtn);
    expect(screen.getByText('Sepatu')).toBeInTheDocument();
    viewCompleted.unmount();

    // Also verify repository archiveGoal on another completed goal creates 0 refund tx
    await completeGoalWithPurchase(g4.id);
    await depositToGoal({
      goalId: 'non-existent',
      amount: 1,
      date: '2026-11-18',
      currentBalance: 0,
    }).catch(() => undefined);
    const txBeforeArchG4 = (await getAllTransactions()).length;
    const archRes = await archiveGoal(g4.id, '2026-11-18');
    expect(archRes.refundedAmount).toBe(0);
    expect(await getAllTransactions()).toHaveLength(txBeforeArchG4);

    // Archived target CAN be permanently deleted (net 0 balance change when saved=0)
    await deleteGoalPermanently(g4.id);
    expect((await getAllGoals()).some((g) => g.id === g4.id)).toBe(false);
  });
});
