import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Mascot } from '../../components/brand/Mascot';
import { deleteTransaction } from '../../data/repositories/transactions';
import { UI_STRINGS } from '../../domain/copy';
import { formatHistoryDayHeader } from '../../domain/dates';
import { formatShort } from '../../domain/money';
import type { Transaction } from '../../domain/types';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { TransactionRow } from '../transactions/TransactionRow';

interface HistoryPageProps {
  live: AppLiveState;
}

type FilterKind = 'all' | 'expense' | 'income';

export function HistoryPage({ live }: HistoryPageProps) {
  const [filter, setFilter] = useState<FilterKind>('all');
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet);
  const showToast = useUIStore((s) => s.showToast);
  const addPendingDelete = useUIStore((s) => s.addPendingDelete);
  const removePendingDelete = useUIStore((s) => s.removePendingDelete);

  const filteredTransactions = useMemo(() => {
    return live.transactions.filter((tx) => {
      if (filter === 'all') return true;
      if (filter === 'expense') {
        return tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0);
      }
      return tx.type === 'income' || (tx.type === 'adjustment' && tx.amount > 0);
    });
  }, [live.transactions, filter]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { items: Transaction[]; totalExpense: number }>();

    for (const tx of filteredTransactions) {
      const existing = groups.get(tx.date) ?? { items: [], totalExpense: 0 };
      existing.items.push(tx);
      if (tx.type === 'expense') {
        existing.totalExpense += tx.amount;
      }
      groups.set(tx.date, existing);
    }

    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const handleQuickDelete = (tx: Transaction) => {
    addPendingDelete(tx.id);
    triggerHaptic(10);

    showToast({
      message: `Dihapus · ${tx.note}`,
      onUndo: () => {
        removePendingDelete(tx.id);
      },
      onExpire: async () => {
        await deleteTransaction(tx.id);
        removePendingDelete(tx.id);
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
                        onSelect={(item) =>
                          openTransactionSheet({ transactionId: item.id })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickDelete(tx)}
                      aria-label={`Hapus transaksi ${tx.note}`}
                      className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--border-soft)] hover:text-[var(--warm)]"
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
