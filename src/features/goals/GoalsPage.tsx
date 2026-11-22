import { ArrowLeft, Plus, Target } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Sheet } from '../../components/ui/Sheet';
import { createGoal } from '../../data/repositories/goals';
import { addDays, formatShortDate } from '../../domain/dates';
import {
  MAX_ACTIVE_GOALS,
  MAX_GOAL_TARGET,
  MIN_GOAL_TARGET,
  computeGoalMetrics,
  validateGoalInput,
} from '../../domain/goals';
import { formatFull, formatHeroShort, parseNominalInput } from '../../domain/money';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';

interface GoalsPageProps {
  live: AppLiveState;
}

const STATUS_BADGE: Record<'active' | 'completed' | 'archived', string> = {
  active: 'Aktif',
  completed: 'Selesai dibeli',
  archived: 'Diarsipkan',
};

export function GoalsPage({ live }: GoalsPageProps) {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState(() => addDays(live.today, 30));
  const [formError, setFormError] = useState<string | null>(null);

  const activeGoals = live.goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const pastGoals = live.goals
    .filter((g) => g.status !== 'active')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const canCreateMore = activeGoals.length < MAX_ACTIVE_GOALS;
  const parsedTarget = parseNominalInput(targetInput);

  const openCreateSheet = () => {
    setNameInput('');
    setTargetInput('');
    setDeadlineInput(addDays(live.today, 30));
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateGoalInput({
      name: nameInput,
      targetAmount: parsedTarget,
      deadline: deadlineInput,
      today: live.today,
    });
    if (!check.ok) {
      setFormError(check.error);
      return;
    }

    try {
      const created = await createGoal({
        name: check.name,
        targetAmount: check.targetAmount,
        today: live.today,
        deadline: check.deadline,
      });
      setIsCreateOpen(false);
      showToast({ message: `Target "${created.name}" dibuat` });
      navigate(`/target/${created.id}`);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal membuat target tabungan.'
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col space-y-4 py-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to="/ringkasan"
            aria-label="Kembali ke Ringkasan"
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--border-soft)]"
          >
            <ArrowLeft size={18} strokeWidth={2.3} aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
              Target Tabungan
            </h1>
            <p className="text-[12px] font-semibold text-[var(--muted)]">
              {activeGoals.length} dari {MAX_ACTIVE_GOALS} target aktif
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!canCreateMore}
          onClick={openCreateSheet}
          style={
            canCreateMore
              ? {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }
              : undefined
          }
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[22px] px-4 text-[13px] font-extrabold ${
            canCreateMore
              ? ''
              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-70'
          }`}
        >
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
          <span>Buat target</span>
        </button>
      </header>

      {!canCreateMore && (
        <p className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--muted)]">
          Batas 3 target aktif tercapai. Selesaikan atau arsipkan salah satu target untuk membuat yang baru.
        </p>
      )}

      {live.goals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
          <Mascot mood="smile" size={52} />
          <p className="mt-3 text-[15px] font-extrabold text-[var(--ink)]">
            Belum ada target tabungan
          </p>
          <p className="mt-1 text-[13px] font-medium text-[var(--muted)]">
            Sisihkan sedikit demi sedikit tanpa bikin jatah hari ini langsung terpukul.
          </p>
          <button
            type="button"
            onClick={openCreateSheet}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
            className="mt-4 min-h-[48px] rounded-[22px] px-5 text-[14px] font-extrabold"
          >
            Buat target pertama
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.length > 0 && (
            <section aria-label="Target aktif" className="space-y-3">
              {activeGoals.map((goal) => {
                const metrics = computeGoalMetrics({
                  goal,
                  transactions: live.transactions,
                  today: live.today,
                  currentDailyAllowance: live.homeState.dailyAllowance,
                });
                return (
                  <Link
                    key={goal.id}
                    to={`/target/${goal.id}`}
                    className="block rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)]"
                        >
                          <Target size={19} strokeWidth={2.2} />
                        </span>
                        <div>
                          <h2 className="text-[15px] font-extrabold text-[var(--ink)]">
                            {goal.name}
                          </h2>
                          <p className="text-[12px] font-semibold text-[var(--muted)]">
                            {metrics.isPastDeadline
                              ? `Lewat tanggal target (${formatShortDate(goal.deadline)})`
                              : `Target ${formatShortDate(goal.deadline)} · ${metrics.daysLeft} hari lagi`}
                          </p>
                        </div>
                      </div>

                      {metrics.isAchieved && (
                        <span
                          style={{
                            backgroundColor: 'var(--coin)',
                            color: 'var(--coin-ink)',
                          }}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold"
                        >
                          Tercapai
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <ProgressBar
                        usedRatio={Math.min(1, metrics.saved / goal.targetAmount)}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[13px]">
                      <span className="tabular-nums font-extrabold text-[var(--ink)]">
                        {formatHeroShort(metrics.saved)} dari{' '}
                        {formatHeroShort(goal.targetAmount)}
                      </span>
                      <span className="tabular-nums font-bold text-[var(--primary)]">
                        {metrics.percent}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

          {pastGoals.length > 0 && (
            <section aria-label="Riwayat target selesai dan arsip" className="space-y-2">
              <h2 className="px-1 text-[13px] font-extrabold text-[var(--muted)]">
                Selesai & Arsip
              </h2>
              <div className="space-y-2">
                {pastGoals.map((goal) => (
                  <Link
                    key={goal.id}
                    to={`/target/${goal.id}`}
                    className="flex min-h-[56px] items-center justify-between gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 hover:border-[var(--border-control)]"
                  >
                    <div>
                      <p className="text-[14px] font-bold text-[var(--ink)]">{goal.name}</p>
                      <p className="text-[12px] font-medium text-[var(--muted)]">
                        {formatHeroShort(goal.targetAmount)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--muted)]">
                      {STATUS_BADGE[goal.status]}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Sheet
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Buat Target Tabungan"
      >
        <form onSubmit={(e) => void handleCreateGoal(e)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="goal-name-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nama target
            </label>
            <input
              id="goal-name-input"
              type="text"
              maxLength={40}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Contoh: Dana darurat atau Ganti SSD"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="goal-target-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal target (Rp 10rb sampai Rp 1M)
            </label>
            <input
              id="goal-target-input"
              type="text"
              inputMode="numeric"
              value={targetInput}
              onChange={(e) => {
                setTargetInput(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Contoh: 3jt atau 500rb"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-bold text-[var(--ink)]"
            />
            {parsedTarget !== null &&
              parsedTarget >= MIN_GOAL_TARGET &&
              parsedTarget <= MAX_GOAL_TARGET && (
                <p className="mt-1 text-[12px] font-bold text-[var(--primary)]">
                  {formatFull(parsedTarget)}
                </p>
              )}
          </div>

          <div>
            <label
              htmlFor="goal-deadline-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Tanggal target tercapai
            </label>
            <input
              id="goal-deadline-input"
              type="date"
              min={addDays(live.today, 1)}
              value={deadlineInput}
              onChange={(e) => {
                setDeadlineInput(e.target.value);
                if (formError) setFormError(null);
              }}
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>

          {formError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
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
              Simpan target
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default GoalsPage;
