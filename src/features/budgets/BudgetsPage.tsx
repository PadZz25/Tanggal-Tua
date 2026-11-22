import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Sheet } from '../../components/ui/Sheet';
import { deleteBudget, upsertBudget } from '../../data/repositories/budgets';
import {
  MAX_BUDGET_AMOUNT,
  MIN_BUDGET_AMOUNT,
  evaluateAllBudgets,
  type BudgetStatus,
} from '../../domain/budgets';
import { formatFull, parseNominalInput } from '../../domain/money';
import { getSelectableCategories } from '../../domain/parser/keywords';
import type { Budget, BudgetPeriod } from '../../domain/types';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';

interface BudgetsPageProps {
  live: AppLiveState;
}

const STATUS_STYLE: Record<
  BudgetStatus,
  {
    label: string;
    fgVar: string;
    bgVar: string;
    barVar: string;
    Icon: typeof CheckCircle2;
  }
> = {
  aman: {
    label: 'Aman',
    fgVar: 'var(--primary)',
    bgVar: 'var(--primary-tint)',
    barVar: 'var(--primary)',
    Icon: CheckCircle2,
  },
  hampir: {
    label: 'Hampir habis',
    fgVar: 'var(--status-hampir)',
    bgVar: 'var(--status-hampir-bg)',
    barVar: 'var(--status-hampir)',
    Icon: AlertCircle,
  },
  habis: {
    label: 'Lewat / Habis',
    fgVar: 'var(--warm-ink)',
    bgVar: 'var(--status-habis-bg)',
    barVar: 'var(--warm-ink)',
    Icon: AlertTriangle,
  },
};

export function BudgetsPage({ live }: BudgetsPageProps) {
  const showToast = useUIStore((s) => s.showToast);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const [amountInput, setAmountInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const evaluations = evaluateAllBudgets(
    live.budgets,
    live.transactions,
    live.today
  );

  const expenseCategories = getSelectableCategories(live.categories, 'expense');
  const budgetedCatIds = new Set(live.budgets.map((b) => b.categoryId));
  const availableCategories = expenseCategories.filter(
    (c) => !budgetedCatIds.has(c.id)
  );

  const parsedAmount = parseNominalInput(amountInput);

  const openCreateSheet = () => {
    if (availableCategories.length === 0) return;
    setEditingBudget(null);
    setCategoryId(availableCategories[0].id);
    setPeriod('month');
    setAmountInput('');
    setFormError(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setPeriod(budget.period);
    setAmountInput(String(budget.amount));
    setFormError(null);
    setIsSheetOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setFormError('Pilih kategori terlebih dahulu.');
      return;
    }
    if (
      parsedAmount === null ||
      !Number.isInteger(parsedAmount) ||
      parsedAmount < MIN_BUDGET_AMOUNT ||
      parsedAmount > MAX_BUDGET_AMOUNT
    ) {
      setFormError('Nominal anggaran antara Rp 1.000 sampai Rp 1.000.000.000.');
      return;
    }

    try {
      await upsertBudget({
        categoryId,
        period,
        amount: parsedAmount,
      });
      const catName = live.categoryMap.get(categoryId)?.name ?? 'Kategori';
      setIsSheetOpen(false);
      showToast({
        message: editingBudget
          ? `Anggaran ${catName} diperbarui`
          : `Anggaran ${catName} disimpan`,
      });
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan anggaran.'
      );
    }
  };

  const handleDelete = async () => {
    if (!editingBudget) return;
    const deleted = editingBudget;
    const catName =
      live.categoryMap.get(deleted.categoryId)?.name ?? 'Kategori';
    await deleteBudget(deleted.categoryId);
    setIsSheetOpen(false);
    showToast({
      message: `Anggaran ${catName} dihapus (riwayat transaksi tetap aman)`,
      onUndo: async () => {
        await upsertBudget({
          categoryId: deleted.categoryId,
          period: deleted.period,
          amount: deleted.amount,
        });
      },
    });
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
              Anggaran
            </h1>
            <p className="text-[12px] font-semibold text-[var(--muted)]">
              Batas santai per kategori periode berjalan
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={availableCategories.length === 0}
          onClick={openCreateSheet}
          style={
            availableCategories.length > 0
              ? {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }
              : undefined
          }
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[22px] px-4 text-[13px] font-extrabold ${
            availableCategories.length > 0
              ? ''
              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-70'
          }`}
        >
          <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
          <span>Atur anggaran</span>
        </button>
      </header>

      {evaluations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
          <Mascot mood="smile" size={52} />
          <p className="mt-3 text-[15px] font-extrabold text-[var(--ink)]">
            Belum ada anggaran kategori
          </p>
          <p className="mt-1 text-[13px] font-medium text-[var(--muted)]">
            Tentukan batas mingguan atau bulanan untuk kategori seperti Jajan atau Makan.
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
            Atur anggaran
          </button>
        </div>
      ) : (
        <ul aria-label="Daftar anggaran per kategori" className="space-y-3">
          {evaluations.map((ev) => {
            const cat = live.categoryMap.get(ev.budget.categoryId);
            const catName = cat?.name ?? 'Kategori';
            const style = STATUS_STYLE[ev.status];
            const StatusIcon = style.Icon;
            const fillPct = Math.min(100, Math.round(ev.ratio * 100));

            return (
              <li key={ev.budget.categoryId}>
                <button
                  type="button"
                  onClick={() => openEditSheet(ev.budget)}
                  className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--border-control)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CategoryIcon
                        iconName={cat?.icon}
                        tone={cat?.tone}
                        size={38}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-extrabold text-[var(--ink)]">
                          {catName}
                        </p>
                        <p className="text-[12px] font-semibold text-[var(--muted)]">
                          {ev.budget.period === 'week' ? 'Mingguan' : 'Bulanan'} ·{' '}
                          {ev.range.label}
                        </p>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: style.bgVar,
                        color: style.fgVar,
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
                    >
                      <StatusIcon size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span>{style.label}</span>
                    </span>
                  </div>

                  <div
                    role="img"
                    aria-label={`Anggaran ${catName} terpakai ${fillPct} persen`}
                    className="mt-3 h-[10px] w-full overflow-hidden rounded-[5px] bg-[var(--border-soft)]"
                  >
                    <div
                      className="h-full rounded-[5px] transition-[width] duration-300"
                      style={{
                        width: `${fillPct}%`,
                        backgroundColor: style.barVar,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    <p
                      style={{ color: style.fgVar }}
                      className="text-[13px] font-extrabold"
                    >
                      {ev.statusText}
                    </p>
                    <p className="tabular-nums text-[12px] font-semibold text-[var(--muted)]">
                      Terpakai {formatFull(ev.spent)}
                    </p>
                  </div>

                  {ev.perHariText && (
                    <p className="mt-1 text-[12px] font-medium text-[var(--muted)]">
                      {ev.perHariText}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={
          editingBudget
            ? `Ubah Anggaran ${live.categoryMap.get(editingBudget.categoryId)?.name ?? ''}`
            : 'Atur Anggaran Kategori'
        }
      >
        <form onSubmit={(e) => void handleSave(e)} className="space-y-4" noValidate>
          {!editingBudget && (
            <div>
              <label
                htmlFor="budget-category-select"
                className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
              >
                Kategori
              </label>
              <select
                id="budget-category-select"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]">
              Periode anggaran
            </span>
            <div
              role="group"
              aria-label="Periode anggaran"
              className="grid grid-cols-2 gap-1.5 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-1"
            >
              {(
                [
                  { id: 'week', label: 'Minggu' },
                  { id: 'month', label: 'Bulan' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={period === opt.id}
                  onClick={() => setPeriod(opt.id)}
                  style={
                    period === opt.id
                      ? {
                          backgroundColor: 'var(--primary)',
                          color: 'var(--on-primary)',
                        }
                      : undefined
                  }
                  className={`min-h-[44px] rounded-[14px] text-[13px] font-extrabold transition-colors ${
                    period === opt.id ? '' : 'text-[var(--muted)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="budget-amount-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Batas nominal
            </label>
            <input
              id="budget-amount-input"
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Contoh: 300rb"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-bold text-[var(--ink)]"
            />
            {parsedAmount !== null &&
              parsedAmount >= MIN_BUDGET_AMOUNT &&
              parsedAmount <= MAX_BUDGET_AMOUNT && (
                <p className="mt-1 text-[12px] font-bold text-[var(--primary)]">
                  {formatFull(parsedAmount)} per {period === 'week' ? 'minggu' : 'bulan'}
                </p>
              )}
          </div>

          {formError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            {editingBudget ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex min-h-[48px] items-center gap-1.5 rounded-[20px] border border-[var(--warm-ink)] px-4 text-[13px] font-extrabold text-[var(--warm-ink)]"
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>Hapus</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
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
                Simpan
              </button>
            </div>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default BudgetsPage;
