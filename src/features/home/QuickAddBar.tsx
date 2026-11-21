import { ArrowUp } from 'lucide-react';
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  createTransaction,
  deleteTransaction,
} from '../../data/repositories/transactions';
import { UI_STRINGS } from '../../domain/copy';
import { formatShort } from '../../domain/money';
import { parseQuickAdd } from '../../domain/parser/parseQuickAdd';
import type { Category, DayMark, Transaction } from '../../domain/types';
import { useViewportKeyboard } from '../../hooks/useViewportKeyboard';
import { runNewTransactionEffects } from '../transactions/postSaveEffects';

interface QuickAddBarProps {
  today: string;
  openingDate: string;
  categories: Category[];
  categoryMap: Map<string, Category>;
  transactions?: Transaction[];
  dayMarks?: DayMark[];
  lastCelebratedStreak?: number;
}

export function QuickAddBar({
  today,
  openingDate,
  categories,
  categoryMap,
  transactions = [],
  dayMarks = [],
  lastCelebratedStreak = 0,
}: QuickAddBarProps) {
  const [text, setText] = useState('');
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const hintId = useId();

  const { isKeyboardOpen, keyboardInsetPx } = useViewportKeyboard();

  const livePreview = useMemo(() => {
    if (!text.trim()) return null;
    const res = parseQuickAdd(text, { today, categories, openingDate });
    if (!res.ok) return null;
    const catName = categoryMap.get(res.categoryId)?.name ?? 'Lainnya';
    return {
      catName,
      amountText: formatShort(res.amount, { withPrefix: true }),
      type: res.type,
    };
  }, [text, today, categories, openingDate, categoryMap]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();

    const parsed = parseQuickAdd(text, { today, categories, openingDate });
    if (!parsed.ok) {
      setErrorHint(parsed.hint);
      inputRef.current?.focus();
      return;
    }

    setErrorHint(null);
    setText('');

    const created = await createTransaction({
      type: parsed.type,
      amount: parsed.amount,
      categoryId: parsed.categoryId,
      note: parsed.note,
      date: parsed.date,
      source: 'quick',
    });

    inputRef.current?.blur();

    const formattedDelta =
      parsed.type === 'income'
        ? `+${formatShort(parsed.amount)}`
        : formatShort(-parsed.amount);

    await runNewTransactionEffects({
      createdTx: created,
      transactionsBefore: transactions,
      dayMarks,
      lastCelebratedStreak,
      today,
      baseMessage: `Tersimpan · ${created.note} ${formattedDelta}`,
      undoTx: () => deleteTransaction(created.id),
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const dockBottomStyle = isKeyboardOpen
    ? keyboardInsetPx > 0
      ? `${keyboardInsetPx + 8}px`
      : 'calc(8px + env(safe-area-inset-bottom, 0px))'
    : 'calc(72px + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      style={{ bottom: dockBottomStyle }}
      className="fixed inset-x-0 z-30 mx-auto max-w-[480px] bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent px-5 pt-2 transition-all duration-200"
    >
      {livePreview && !errorHint && (
        <div className="mb-1.5 flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-0.5 text-[12px] font-bold text-[var(--ink)] shadow-sm">
            <span>{livePreview.catName}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[var(--primary)]">
              {livePreview.type === 'income' ? '+' : ''}
              {livePreview.amountText}
            </span>
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        aria-label="Form catat cepat"
        noValidate
        className="flex min-h-[56px] items-center gap-2 rounded-[28px] border border-[var(--border-control)] bg-[var(--surface)] pl-4 pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[var(--primary)]"
      >
        <label htmlFor={inputId} className="visually-hidden">
          {UI_STRINGS.quickInputLabel}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (errorHint) setErrorHint(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={UI_STRINGS.quickInputPlaceholder}
          enterKeyHint="send"
          autoComplete="off"
          aria-invalid={errorHint ? 'true' : undefined}
          aria-describedby={errorHint ? hintId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
        />

        <button
          type="submit"
          aria-label="Simpan catatan cepat"
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--on-primary)',
          }}
          className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full transition-transform hover:opacity-90 active:scale-95"
        >
          <ArrowUp size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </form>

      {errorHint && (
        <p
          id={hintId}
          role="alert"
          className="mt-1.5 px-3 text-[12px] font-bold text-[var(--warm-ink)]"
        >
          {errorHint}
        </p>
      )}
    </div>
  );
}
