import { Flame } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { formatShortDate } from '../../domain/dates';
import { getBrokenStreakCopy, type StreakSummary } from '../../domain/streak';

interface StreakSheetProps {
  open: boolean;
  onClose: () => void;
  streak: StreakSummary;
  onMarkNoSpendToday: () => Promise<void>;
}

export function StreakSheet({
  open,
  onClose,
  streak,
  onMarkNoSpendToday,
}: StreakSheetProps) {
  const isBroken = streak.currentStreak === 0 && streak.longestStreak > 0;

  let statusDescription: string;
  if (streak.isLoggedToday) {
    statusDescription = 'Hari ini sudah tercatat. Pertahankan ritmenya.';
  } else if (streak.isPendingToday) {
    statusDescription =
      'Catat transaksi atau tandai hari ini tanpa pengeluaran agar streak tetap nyambung.';
  } else if (isBroken) {
    statusDescription = getBrokenStreakCopy(streak.longestStreak);
  } else {
    statusDescription =
      'Catat transaksi pertama atau tandai hari tanpa pengeluaran untuk mulai.';
  }

  const handleMarkClick = async () => {
    await onMarkNoSpendToday();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Streak Mencatat">
      <div className="space-y-4">
        <div className="flex items-center gap-3.5 rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-4">
          <span
            aria-hidden="true"
            style={{
              backgroundColor: 'var(--coin)',
              color: 'var(--coin-ink)',
            }}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          >
            <Flame size={24} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[22px] font-extrabold leading-tight text-[var(--ink)]">
              {streak.currentStreak} hari berturut-turut
            </p>
            <p className="text-[13px] font-bold text-[var(--muted)]">
              Streak terpanjang: {streak.longestStreak} hari
            </p>
          </div>
        </div>

        <p className="text-[13px] font-medium leading-relaxed text-[var(--ink)]">
          {statusDescription}
        </p>

        <div>
          <p className="mb-2 text-[12px] font-bold text-[var(--muted)]">
            14 hari terakhir
          </p>
          <ul
            aria-label="Aktivitas pencatatan 14 hari terakhir"
            className="grid grid-cols-7 gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-3"
          >
            {streak.last14Days.map((day) => {
              const dateLabel = formatShortDate(day.date);
              const stateText = day.logged ? 'tercatat' : 'belum tercatat';
              return (
                <li key={day.date} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden="true"
                    title={`${dateLabel}: ${stateText}`}
                    style={
                      day.logged
                        ? {
                            backgroundColor: 'var(--primary)',
                            borderColor: 'var(--primary)',
                          }
                        : undefined
                    }
                    className={`h-3.5 w-3.5 rounded-full border ${
                      day.logged
                        ? ''
                        : day.isToday
                          ? 'border-[var(--primary)] bg-[var(--surface)]'
                          : 'border-[var(--border-control)] bg-[var(--surface)]'
                    }`}
                  />
                  <span aria-hidden="true" className="text-[10px] font-semibold text-[var(--muted)]">
                    {dateLabel.split(' ')[0]}
                  </span>
                  <span className="visually-hidden">
                    {dateLabel}: {stateText}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="button"
          disabled={streak.isLoggedToday}
          onClick={() => void handleMarkClick()}
          style={
            streak.isLoggedToday
              ? undefined
              : {
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }
          }
          className={`min-h-[48px] w-full rounded-[20px] px-4 text-[14px] font-extrabold transition-colors ${
            streak.isLoggedToday
              ? 'border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] opacity-75'
              : ''
          }`}
        >
          Hari ini tidak ada pengeluaran
        </button>

        {streak.isLoggedToday && (
          <p className="text-center text-[12px] font-medium text-[var(--muted)]">
            Hari ini sudah tercatat di streakmu.
          </p>
        )}
      </div>
    </Sheet>
  );
}
