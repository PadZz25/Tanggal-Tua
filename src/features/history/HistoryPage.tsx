import { Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import {
  deleteTransaction,
  restoreTransaction,
} from '../../data/repositories/transactions';
import { UI_STRINGS } from '../../domain/copy';
import {
  formatDateRangeLabel,
  formatHistoryDayHeader,
  formatShortDate,
} from '../../domain/dates';
import { formatShort } from '../../domain/money';
import { GOAL_TX_LOCKED_MESSAGE } from '../../domain/savings';
import type { Transaction } from '../../domain/types';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { TransactionRow } from '../transactions/TransactionRow';

interface HistoryPageProps {
  live: AppLiveState;
}

type FilterKind = 'all' | 'expense' | 'income';

const DATE_QUERY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function formatRangeChipLabel(dari: string | null, sampai: string | null): string {
  if (dari && sampai) {
    return formatDateRangeLabel(dari, sampai);
  }
  if (dari) return `Dari ${formatShortDate(dari)}`;
  if (sampai) return `Sampai ${formatShortDate(sampai)}`;
  return '';
}

export function HistoryPage({ live }: HistoryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterKind>('all');
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet);
  const showToast = useUIStore((s) => s.showToast);

  const kategoriParam = searchParams.get('kategori') || null;
  const dariParam = searchParams.get('dari');
  const sampaiParam = searchParams.get('sampai');
  const validDari = dariParam && DATE_QUERY_REGEX.test(dariParam) ? dariParam : null;
  const validSampai =
    sampaiParam && DATE_QUERY_REGEX.test(sampaiParam) ? sampaiParam : null;

  const hasQueryFilter = Boolean(kategoriParam || validDari || validSampai);

  const chipLabel = useMemo(() => {
    const parts: string[] = [];
    if (kategoriParam) {
      parts.push(live.categoryMap.get(kategoriParam)?.name ?? 'Kategori');
    }
    const rangeText = formatRangeChipLabel(validDari, validSampai);
    if (rangeText) {
      parts.push(rangeText);
    }
    return parts.join(' · ');
  }, [kategoriParam, validDari, validSampai, live.categoryMap]);

  const clearQueryFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('kategori');
    next.delete('dari');
    next.delete('sampai');
    setSearchParams(next);
  };

  const filteredTransactions = useMemo(() => {
    return live.transactions.filter((tx) => {
      if (kategoriParam) {
        const effectiveCategoryId =
          tx.type === 'expense'
            ? (tx.categoryId ?? 'cat-lainnya-expense')
            : tx.type === 'income'
              ? (tx.categoryId ?? 'cat-lainnya-income')
              : tx.categoryId;
        if (effectiveCategoryId !== kategoriParam) {
          return false;
        }
      }
      if (validDari && tx.date < validDari) {
        return false;
      }
      if (validSampai && tx.date > validSampai) {
        return false;
      }

      if (filter === 'all') return true;
      if (filter === 'expense') {
        return tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0);
      }
      return tx.type === 'income' || (tx.type === 'adjustment' && tx.amount > 0);
    });
  }, [live.transactions, filter, kategoriParam, validDari, validSampai]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { items: Transaction[]; totalExpense: number }>();

    for (const tx of filteredTransactions) {
      const existing = groups.get(tx.date) ?? { items: [], totalExpense: 0 };
      existing.items.push(tx);
      if (tx.type === 'expense' && !tx.goalId) {
        existing.totalExpense += tx.amount;
      }
      groups.set(tx.date, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const handleSelectTransaction = (tx: Transaction) => {
    if (tx.goalId) {
      showToast({ message: GOAL_TX_LOCKED_MESSAGE });
      return;
    }
    openTransactionSheet({ transactionId: tx.id });
  };

  const handleQuickDelete = async (tx: Transaction) => {
    if (tx.goalId) {
      showToast({ message: GOAL_TX_LOCKED_MESSAGE });
      return;
    }
    await deleteTransaction(tx.id);
    triggerHaptic(10);

    showToast({
      message: `Dihapus · ${tx.note}`,
      onUndo: async () => {
        await restoreTransaction(tx);
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 -mx-5 border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 pb-3 pt-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
            Riwayat
          </h1>
          <button
            type="button"
            onClick={() => openTransactionSheet({ defaultType: 'expense' })}
            aria-label="Tambah transaksi baru"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[22px] border border-[var(--border-control)] bg-[var(--surface)] px-3.5 text-[13px] font-extrabold text-[var(--ink)] hover:bg-[var(--border-soft)] active:scale-95"
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>Tambah</span>
          </button>
        </div>

        <div
          role="group"
          aria-label="Filter jenis transaksi"
          className="mt-3 grid grid-cols-3 gap-1.5 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-1"
        >
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'expense', label: 'Keluar' },
              { id: 'income', label: 'Masuk' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[40px] rounded-[14px] text-[13px] font-extrabold transition-colors ${
                filter === tab.id
                  ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasQueryFilter && chipLabel && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="history-filter-chip"
              onClick={clearQueryFilters}
              aria-label={`Hapus filter ${chipLabel}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--primary-tint)] px-3.5 text-[13px] font-extrabold text-[var(--primary)] hover:opacity-90"
            >
              <span>{chipLabel}</span>
              <X size={15} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {groupedByDate.length === 0 ? (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-10 text-center">
          <Mascot mood="smile" size={48} />
          <p className="mt-3 text-[14px] font-semibold text-[var(--muted)]">
            {UI_STRINGS.emptyHistory}
          </p>
          <button
            type="button"
            onClick={() => openTransactionSheet({ defaultType: 'expense' })}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
            className="mt-4 min-h-[44px] rounded-[22px] px-5 text-[14px] font-extrabold"
          >
            Catat transaksi
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groupedByDate.map(([dateStr, group]) => (
            <section
              key={dateStr}
              aria-label={`Transaksi ${formatHistoryDayHeader(dateStr, live.today)}`}
            >
              <div className="mb-1.5 flex items-center justify-between px-1">
                <h2 className="text-[13px] font-extrabold text-[var(--muted)]">
                  {formatHistoryDayHeader(dateStr, live.today)}
                </h2>
                {group.totalExpense > 0 && (
                  <span className="tabular-nums text-[12px] font-bold text-[var(--muted)]">
                    Keluar {formatShort(-group.totalExpense)}
                  </span>
                )}
              </div>

              <div className="divide-y divide-[var(--border-soft)] rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-1.5">
                {group.items.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <TransactionRow
                        transaction={tx}
                        category={
                          tx.categoryId ? live.categoryMap.get(tx.categoryId) : undefined
                        }
                        onSelect={handleSelectTransaction}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleQuickDelete(tx)}
                      aria-label={`Hapus transaksi ${tx.note}`}
                      className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--border-soft)] hover:text-[var(--warm-ink)]"
                    >
                      <Trash2 size={17} strokeWidth={2.1} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
