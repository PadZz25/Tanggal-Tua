import { Link } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { UI_STRINGS } from '../../domain/copy';
import type { Category, Transaction } from '../../domain/types';
import { TransactionRow } from '../transactions/TransactionRow';

interface TodayListProps {
  transactions: Transaction[];
  categoryMap: Map<string, Category>;
  onSelectTransaction: (tx: Transaction) => void;
}

export function TodayList({
  transactions,
  categoryMap,
  onSelectTransaction,
}: TodayListProps) {
  const recentToday = transactions.slice(0, 3);

  return (
    <section aria-label="Daftar transaksi hari ini" className="mt-4 flex flex-1 flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-extrabold text-[var(--ink)]">
          {UI_STRINGS.todaySectionTitle}
        </h2>
        <Link
          to="/riwayat"
          className="inline-flex min-h-[44px] items-center rounded-xl px-2 text-[13px] font-bold text-[var(--primary)] hover:underline"
        >
          {UI_STRINGS.seeAllLink}
        </Link>
      </div>

      {recentToday.length === 0 ? (
        <div className="mt-1 flex flex-1 flex-col items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-center">
          <Mascot mood="smile" size={44} />
          <p className="mt-2.5 text-[14px] font-semibold text-[var(--muted)]">
            {UI_STRINGS.emptyToday}
          </p>
        </div>
      ) : (
        <div className="mt-1 divide-y divide-[var(--border-soft)] rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-1.5">
          {recentToday.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              category={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
              onSelect={onSelectTransaction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
