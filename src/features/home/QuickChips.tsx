import { Flame, Plus } from 'lucide-react';
import {
  applyTemplateQuickTap,
  revertTemplateQuickTap,
} from '../../data/repositories/templates';
import { UI_STRINGS } from '../../domain/copy';
import { formatShort } from '../../domain/money';
import type { Budget, Category, DayMark, Template, Transaction } from '../../domain/types';
import { runNewTransactionEffects } from '../transactions/postSaveEffects';

interface QuickChipsProps {
  templates: Template[];
  today: string;
  transactions?: Transaction[];
  dayMarks?: DayMark[];
  budgets?: Budget[];
  categoryMap?: ReadonlyMap<string, Category>;
  lastCelebratedStreak?: number;
  currentStreak: number;
  onOpenStreakSheet: () => void;
  onAddTemplateClick: () => void;
}

export function QuickChips({
  templates,
  today,
  transactions = [],
  dayMarks = [],
  budgets = [],
  categoryMap = new Map(),
  lastCelebratedStreak = 0,
  currentStreak,
  onOpenStreakSheet,
  onAddTemplateClick,
}: QuickChipsProps) {
  const handleChipTap = async (tpl: Template) => {
    const { transaction, previousUsageCount } = await applyTemplateQuickTap({
      templateId: tpl.id,
      date: today,
    });

    await runNewTransactionEffects({
      createdTx: transaction,
      transactionsBefore: transactions,
      dayMarks,
      budgets,
      categoryMap,
      lastCelebratedStreak,
      today,
      baseMessage: `Tersimpan · ${tpl.label} ${formatShort(-tpl.amount)}`,
      undoTx: () =>
        revertTemplateQuickTap({
          templateId: tpl.id,
          transactionId: transaction.id,
          previousUsageCount,
        }),
    });
  };

  return (
    <section aria-label={UI_STRINGS.quickSectionLabel} className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-[var(--muted)]">
          {UI_STRINGS.quickSectionLabel}
        </h2>

        <button
          type="button"
          data-testid="streak-pill"
          onClick={onOpenStreakSheet}
          aria-label={`Streak mencatat ${currentStreak} hari`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--border-control)] bg-[var(--surface)] px-3 text-[12px] font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
        >
          <Flame size={15} strokeWidth={2.3} className="text-[var(--primary)]" aria-hidden="true" />
          <span className="tabular-nums">{currentStreak} hari</span>
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => void handleChipTap(tpl)}
            className="inline-flex h-[44px] items-center gap-1.5 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-bold text-[var(--ink)] transition-colors hover:border-[var(--border-control)] hover:bg-[var(--border-soft)] active:scale-95"
          >
            <span>{tpl.label}</span>
            <span className="tabular-nums text-[13px] font-semibold text-[var(--muted)]">
              {formatShort(tpl.amount)}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onAddTemplateClick}
          aria-label="Tambah template catat cepat"
          className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-dashed border-[var(--border-control)] bg-transparent text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
