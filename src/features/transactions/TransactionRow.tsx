import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { formatShort } from '../../domain/money';
import type { Category, Transaction } from '../../domain/types';

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onSelect: (tx: Transaction) => void;
}

function formatTimeHHMM(isoString: string): string {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
}

export function TransactionRow({
  transaction,
  category,
  onSelect,
}: TransactionRowProps) {
  const isIncome =
    transaction.type === 'income' ||
    (transaction.type === 'adjustment' && transaction.amount > 0);

  const absAmount = Math.abs(transaction.amount);
  const formattedAmount = isIncome
    ? `+${formatShort(absAmount)}`
    : formatShort(-absAmount);

  const categoryLabel =
    transaction.type === 'adjustment'
      ? 'Koreksi saldo'
      : category?.name ?? 'Lainnya';

  const timeLabel = formatTimeHHMM(transaction.occurredAt);
  const subtitle = timeLabel ? `${categoryLabel} · ${timeLabel}` : categoryLabel;

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[18px] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--border-soft)] active:opacity-85"
    >
      <div className="flex min-w-0 items-center gap-3">
        <CategoryIcon
          iconName={
            transaction.type === 'adjustment'
              ? 'SlidersHorizontal'
              : category?.icon ?? 'MoreHorizontal'
          }
          tone={
            transaction.type === 'adjustment'
              ? 'transport'
              : category?.tone ?? 'lainnya'
          }
          size={40}
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-[var(--ink)]">
            {transaction.note}
          </p>
          <p className="truncate text-[12px] font-medium text-[var(--muted)]">
            {subtitle}
          </p>
        </div>
      </div>

      <span
        className={`tabular-nums shrink-0 text-[15px] font-extrabold ${
          isIncome ? 'text-[var(--primary)]' : 'text-[var(--ink)]'
        }`}
      >
        {formattedAmount}
      </span>
    </button>
  );
}
