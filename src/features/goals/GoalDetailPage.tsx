import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Sheet } from '../../components/ui/Sheet';
import {
  archiveGoal,
  completeGoalWithPurchase,
  deleteGoalTransaction,
  depositToGoal,
  withdrawFromGoal,
} from '../../data/repositories/goals';
import { formatShortDate } from '../../domain/dates';
import {
  computeGoalMetrics,
  previewGoalDepositAllowance,
} from '../../domain/goals';
import { formatFull, formatHeroShort, formatShort, parseNominalInput } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { requestPersistentStorage } from '../../lib/pwa';

interface GoalDetailPageProps {
  live: AppLiveState;
}

export function GoalDetailPage({ live }: GoalDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const showToast = useUIStore((s) => s.showToast);
  const triggerMascotReaction = useUIStore((s) => s.triggerMascotReaction);
  const setMascotCelebration = useUIStore((s) => s.setMascotCelebration);

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositInput, setDepositInput] = useState('');
  const [depositError, setDepositError] = useState<string | null>(null);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawInput, setWithdrawInput] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const goal = live.goals.find((g) => g.id === id) ?? null;

  if (!goal) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
        <Mascot mood="flat" size={48} />
        <h1 className="text-[18px] font-extrabold text-[var(--ink)]">
          Target tidak ditemukan
        </h1>
        <Link
          to="/target"
          className="inline-flex min-h-[44px] items-center rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
        >
          Kembali ke daftar target
        </Link>
      </div>
    );
  }

  const metrics = computeGoalMetrics({
    goal,
    transactions: live.transactions,
    today: live.today,
    currentDailyAllowance: live.homeState.dailyAllowance,
  });

  const goalTxs = live.transactions.filter((tx) => tx.goalId === goal.id);
  const parsedDeposit = parseNominalInput(depositInput);
  const parsedWithdraw = parseNominalInput(withdrawInput);

  const allowancePreview = previewGoalDepositAllowance({
    currentBalance: live.homeState.currentBalance,
    spentToday: live.homeState.spentToday,
    daysLeft: Math.max(1, live.homeState.daysLeft),
    depositAmount: parsedDeposit && parsedDeposit > 0 ? parsedDeposit : 0,
  });

  const openDepositSheet = () => {
    const available = Math.max(0, live.homeState.currentBalance);
    const suggested = metrics.perWeek ?? metrics.remaining;
    const defaultVal =
      available > 0 && suggested > 0 ? Math.min(suggested, available) : 0;
    setDepositInput(defaultVal > 0 ? String(defaultVal) : '');
    setDepositError(null);
    setIsDepositOpen(true);
  };

  const handleDepositSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (parsedDeposit === null || !Number.isInteger(parsedDeposit) || parsedDeposit < 1) {
      setDepositError('Masukkan nominal yang valid (minimal Rp 1).');
      return;
    }

    try {
      const res = await depositToGoal({
        goalId: goal.id,
        amount: parsedDeposit,
        date: live.today,
        currentBalance: live.homeState.currentBalance,
      });

      triggerHaptic(10);
      triggerMascotReaction();
      void requestPersistentStorage();
      setIsDepositOpen(false);

      if (res.milestoneReached) {
        const msg = `Keren! Target ${goal.name} mencapai ${res.milestoneReached}%`;
        setMascotCelebration({ mood: 'cheer', message: msg });
        showToast({ message: msg });
      } else {
        showToast({
          message: `Tersimpan · Disisihkan ${formatShort(parsedDeposit)} ke ${goal.name}`,
        });
      }
    } catch (err: unknown) {
      setDepositError(
        err instanceof Error ? err.message : 'Gagal menyisihkan dana.'
      );
    }
  };

  const handleWithdrawSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      parsedWithdraw === null ||
      !Number.isInteger(parsedWithdraw) ||
      parsedWithdraw < 1
    ) {
      setWithdrawError('Masukkan nominal penarikan yang valid.');
      return;
    }

    try {
      await withdrawFromGoal({
        goalId: goal.id,
        amount: parsedWithdraw,
        date: live.today,
      });
      triggerHaptic(10);
      setIsWithdrawOpen(false);
      showToast({
        message: `Ditarik ${formatShort(parsedWithdraw)} kembali ke saldo`,
      });
    } catch (err: unknown) {
      setWithdrawError(
        err instanceof Error ? err.message : 'Gagal menarik dana target.'
      );
    }
  };

  const handleCompleteForPurchase = async () => {
    await completeGoalWithPurchase(goal.id);
    setMascotCelebration({
      mood: 'cheer',
      message: `Selamat! Target ${goal.name} siap dipakai.`,
    });
    showToast({ message: `Target "${goal.name}" selesai dipakai` });
  };

  const handleConfirmArchive = async () => {
    const res = await archiveGoal(goal.id, live.today);
    setIsArchiveOpen(false);
    showToast({
      message:
        res.refundedAmount > 0
          ? `Diarsipkan · ${formatFull(res.refundedAmount)} kembali ke saldo`
          : `Target "${goal.name}" diarsipkan`,
    });
  };

  const handleConfirmDeleteTx = async () => {
    if (!deletingTx) return;
    try {
      await deleteGoalTransaction(goal.id, deletingTx.id);
      setDeletingTx(null);
      showToast({ message: 'Entri tabungan dihapus' });
    } catch (err: unknown) {
      setDeletingTx(null);
      showToast({
        message:
          err instanceof Error ? err.message : 'Entri tidak bisa dihapus.',
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col space-y-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/target"
            aria-label="Kembali ke daftar target"
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--border-soft)]"
          >
            <ArrowLeft size={18} strokeWidth={2.3} aria-hidden="true" />
          </Link>
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
            {goal.name}
          </h1>
        </div>

        {metrics.isAchieved && goal.status === 'active' && (
          <span
            style={{
              backgroundColor: 'var(--coin)',
              color: 'var(--coin-ink)',
            }}
            className="rounded-full px-3 py-1 text-[12px] font-extrabold"
          >
            Tercapai
          </span>
        )}
        {goal.status === 'completed' && (
          <span className="rounded-full bg-[var(--primary-tint)] px-3 py-1 text-[12px] font-extrabold text-[var(--primary)]">
            Selesai dibeli
          </span>
        )}
        {goal.status === 'archived' && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] font-bold text-[var(--muted)]">
            Diarsipkan
          </span>
        )}
      </header>

      {/* Progress & track status card */}
      <section
        aria-label="Progres target tabungan"
        className="space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="tabular-nums text-[22px] font-extrabold text-[var(--ink)]">
            {formatFull(metrics.saved)}
          </p>
          <p className="tabular-nums text-[14px] font-extrabold text-[var(--primary)]">
            {metrics.percent}%
          </p>
        </div>

        <ProgressBar
          usedRatio={Math.min(1, metrics.saved / goal.targetAmount)}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-[var(--muted)]">
          <span>dari target {formatFull(goal.targetAmount)}</span>
          {goal.status === 'active' && (
            <span>
              Tenggat {formatShortDate(goal.deadline)} ({metrics.daysLeft} hari lagi)
            </span>
          )}
        </div>

        <div className="rounded-[16px] bg-[var(--bg)] p-3">
          <p className="text-[13px] font-extrabold text-[var(--ink)]">
            {metrics.trackStatus}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-[var(--muted)]">
            Acuan rencana hari ini: {formatFull(metrics.expectedSaved)} (hari ke-
            {metrics.elapsedDays} dari {metrics.totalDays}), tersimpan{' '}
            {formatFull(metrics.saved)}.
          </p>
        </div>
      </section>

      {/* Suggestion card when active and remaining > 0 */}
      {goal.status === 'active' &&
        metrics.remaining > 0 &&
        metrics.perWeek !== null &&
        metrics.perMonth !== null &&
        metrics.dailyEffect !== null && (
          <section
            aria-label="Saran tabungan"
            className="space-y-2 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <h2 className="text-[14px] font-extrabold text-[var(--ink)]">
              Saran setoran
            </h2>
            <p className="text-[13px] font-semibold text-[var(--ink)]">
              {formatFull(metrics.perWeek)}/minggu · {formatFull(metrics.perMonth)}/bulan
            </p>
            <p className="text-[12px] font-medium text-[var(--muted)]">
              Dampak ke jatah harian: sekitar {formatHeroShort(metrics.dailyEffect)} per hari
            </p>
            {metrics.isHeavy && (
              <p className="rounded-[14px] bg-[var(--status-hampir-bg)] px-3 py-2 text-[12px] font-semibold text-[var(--status-hampir)]">
                Target ini lumayan berat untuk jatahmu sekarang. Coba mundurkan tanggalnya atau kecilkan targetnya.
              </p>
            )}
          </section>
        )}

      {/* Action buttons when active */}
      {goal.status === 'active' && (
        <section aria-label="Aksi target tabungan" className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={openDepositSheet}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
            className="min-h-[48px] rounded-[20px] px-4 text-[14px] font-extrabold"
          >
            Sisihkan
          </button>

          <button
            type="button"
            disabled={metrics.saved <= 0}
            onClick={() => {
              setWithdrawInput('');
              setWithdrawError(null);
              setIsWithdrawOpen(true);
            }}
            className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] bg-[var(--surface)] px-4 text-[14px] font-extrabold text-[var(--ink)] disabled:opacity-45"
          >
            Tarik
          </button>

          <button
            type="button"
            disabled={metrics.saved <= 0}
            onClick={() => void handleCompleteForPurchase()}
            className="min-h-[48px] rounded-[20px] border border-[var(--primary)] bg-[var(--primary-tint)] px-4 text-[13px] font-extrabold text-[var(--primary)] disabled:opacity-45"
          >
            Pakai untuk beli
          </button>

          <button
            type="button"
            onClick={() => setIsArchiveOpen(true)}
            className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] bg-[var(--surface)] px-4 text-[13px] font-bold text-[var(--ink)]"
          >
            Arsipkan
          </button>
        </section>
      )}

      {/* Goal transaction history */}
      <section aria-label="Riwayat setoran dan penarikan" className="space-y-2">
        <h2 className="px-1 text-[14px] font-extrabold text-[var(--ink)]">
          Riwayat setoran & penarikan
        </h2>

        {goalTxs.length === 0 ? (
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 text-center text-[13px] font-medium text-[var(--muted)]">
            Belum ada setoran ke target ini.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-soft)] rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-2">
            {goalTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex min-h-[56px] items-center justify-between gap-2 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-[var(--ink)]">
                    {tx.note}
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">
                    {formatShortDate(tx.date)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-[14px] font-extrabold text-[var(--ink)]">
                    {tx.type === 'expense'
                      ? `+${formatFull(tx.amount)}`
                      : formatFull(-tx.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeletingTx(tx)}
                    aria-label={`Hapus entri ${tx.note}`}
                    className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--border-soft)] hover:text-[var(--warm-ink)]"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Deposit sheet */}
      <Sheet
        open={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={`Sisihkan ke ${goal.name}`}
      >
        <form onSubmit={(e) => void handleDepositSubmit(e)} className="space-y-4" noValidate>
          <p className="text-[13px] font-medium text-[var(--muted)]">
            Sisa uangmu saat ini: {formatFull(live.homeState.currentBalance)}
          </p>

          <div>
            <label
              htmlFor="goal-deposit-amount"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal yang disisihkan
            </label>
            <input
              id="goal-deposit-amount"
              type="text"
              inputMode="numeric"
              value={depositInput}
              onChange={(e) => {
                setDepositInput(e.target.value);
                if (depositError) setDepositError(null);
              }}
              placeholder="Contoh: 130rb"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-bold text-[var(--ink)]"
            />
          </div>

          <p
            data-testid="goal-deposit-preview"
            className="rounded-[16px] bg-[var(--primary-tint)] px-3.5 py-2.5 text-[13px] font-bold text-[var(--primary)]"
          >
            Jatah hari ini jadi {formatHeroShort(allowancePreview.afterDaily)} (dari{' '}
            {formatHeroShort(allowancePreview.beforeDaily)})
          </p>

          {depositError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {depositError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDepositOpen(false)}
              className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
            >
              Simpan setoran
            </button>
          </div>
        </form>
      </Sheet>

      {/* Withdraw sheet */}
      <Sheet
        open={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title={`Tarik dari ${goal.name}`}
      >
        <form onSubmit={(e) => void handleWithdrawSubmit(e)} className="space-y-4" noValidate>
          <p className="text-[13px] font-medium text-[var(--muted)]">
            Dana tersimpan di target ini: {formatFull(metrics.saved)}
          </p>

          <div>
            <label
              htmlFor="goal-withdraw-amount"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal penarikan
            </label>
            <input
              id="goal-withdraw-amount"
              type="text"
              inputMode="numeric"
              value={withdrawInput}
              onChange={(e) => {
                setWithdrawInput(e.target.value);
                if (withdrawError) setWithdrawError(null);
              }}
              placeholder="Contoh: 50rb"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-bold text-[var(--ink)]"
            />
          </div>

          {withdrawError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {withdrawError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsWithdrawOpen(false)}
              className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
            >
              Tarik dana
            </button>
          </div>
        </form>
      </Sheet>

      {/* Archive confirmation sheet */}
      <Sheet
        open={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        title="Arsipkan target?"
      >
        <div className="space-y-4">
          <p className="text-[14px] font-medium text-[var(--ink)]">
            {metrics.saved > 0
              ? `Uang tersimpan ${formatFull(metrics.saved)} akan dikembalikan ke saldomu otomatis melalui transaksi Tarik tabungan. Riwayat setoran tetap tersimpan.`
              : 'Target ini akan dipindahkan ke arsip. Riwayatnya tetap tersimpan.'}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsArchiveOpen(false)}
              className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmArchive()}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
            >
              Ya, arsipkan
            </button>
          </div>
        </div>
      </Sheet>

      {/* Delete goal entry confirmation sheet */}
      <Sheet
        open={deletingTx !== null}
        onClose={() => setDeletingTx(null)}
        title="Hapus entri tabungan?"
      >
        {deletingTx && (
          <div className="space-y-4">
            <p className="text-[14px] font-medium text-[var(--ink)]">
              Entri "{deletingTx.note}" ({formatFull(deletingTx.amount)}) akan dihapus dan saldo uangmu menyesuaikan otomatis.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteTx()}
                style={{ backgroundColor: 'var(--warm)', color: '#FFFFFF' }}
                className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
              >
                Ya, hapus
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default GoalDetailPage;
