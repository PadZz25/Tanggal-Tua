import { AlertCircle, Bell, Download, Flame, Plus, Target, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/brand/Wordmark';
import { IosInstallGuide } from '../../components/ui/IosInstallGuide';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Sheet } from '../../components/ui/Sheet';
import { exportToJson } from '../../data/exportImport';
import { markNoSpendDay, removeDayMark } from '../../data/repositories/dayMarks';
import { updateSettings } from '../../data/repositories/settings';
import { createTemplate } from '../../data/repositories/templates';
import { pickHomeBanner, shouldShowBackupReminder } from '../../domain/banners';
import {
  evaluateAllBudgets,
  formatBudgetHomeAlert,
} from '../../domain/budgets';
import { addDays } from '../../domain/dates';
import { pickPrimaryActiveGoal } from '../../domain/goals';
import { formatHeroShort, isValidAmount, parseNominalInput } from '../../domain/money';
import { getSelectableCategories } from '../../domain/parser/keywords';
import {
  readDismissedReminderDate,
  shouldShowDailyReminder,
  writeDismissedReminderDate,
} from '../../domain/reminder';
import { computeGoalSaved, GOAL_TX_LOCKED_MESSAGE, isLinkedGoalTransaction } from '../../domain/savings';
import { useCurrentMinutes } from '../../hooks/useCurrentMinutes';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';
import { downloadBlob } from '../../lib/download';
import { isIosSafari, usePwaStatus } from '../../lib/pwa';
import { HeroCard } from './HeroCard';
import { QuickAddBar } from './QuickAddBar';
import { QuickChips } from './QuickChips';
import { StreakSheet } from './StreakSheet';
import { TodayList } from './TodayList';
import { markNoSpendTodayWithEffects } from '../transactions/postSaveEffects';

interface HomePageProps {
  live: AppLiveState;
}

export function HomePage({ live }: HomePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet);
  const showToast = useUIStore((s) => s.showToast);
  const paydayRolledBanner = useUIStore((s) => s.paydayRolledBanner);
  const pwaStatus = usePwaStatus();

  const quickAddInputRef = useRef<HTMLInputElement>(null);
  const currentMinutes = useCurrentMinutes();
  const [dismissedReminderDate, setDismissedReminderDate] = useState<string | null>(() =>
    readDismissedReminderDate()
  );
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [tplLabel, setTplLabel] = useState('');
  const [tplAmountRaw, setTplAmountRaw] = useState('');
  const [tplCategoryId, setTplCategoryId] = useState('cat-jajan');
  const [tplError, setTplError] = useState<string | null>(null);

  useEffect(() => {
    const search = window.location.search || location.search;
    const params = new URLSearchParams(search);
    if (params.get('aksi') === 'catat') {
      quickAddInputRef.current?.focus();
      params.delete('aksi');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [location.search]);

  const expenseCategories = getSelectableCategories(live.categories, 'expense');
  const primaryGoal = pickPrimaryActiveGoal(live.goals);
  const primaryGoalSaved = primaryGoal
    ? computeGoalSaved(live.transactions, primaryGoal.id)
    : 0;
  const budgetEvaluations = evaluateAllBudgets(
    live.budgets,
    live.transactions,
    live.today
  );
  const budgetAlertText = formatBudgetHomeAlert(budgetEvaluations, live.categoryMap);
  const hasHabisBudget = budgetEvaluations.some((e) => e.status === 'habis');

  const showReminderBanner = shouldShowDailyReminder({
    enabled: live.settings.reminderEnabled,
    reminderTime: live.settings.reminderTime,
    currentMinutes,
    today: live.today,
    dismissedDate: dismissedReminderDate,
    transactions: live.transactions,
    dayMarks: live.dayMarks,
  });

  const showIosInstallBanner =
    isIosSafari() && !pwaStatus.isStandalone && !live.settings.iosHintDismissed;

  const showBackupBanner = shouldShowBackupReminder({
    transactionsCount: live.transactions.length,
    lastExportAt: live.settings.lastExportAt,
    backupSnoozeUntil: live.settings.backupSnoozeUntil,
    today: live.today,
  });

  const activeBanner = pickHomeBanner({
    payday: paydayRolledBanner,
    reminder: showReminderBanner,
    budget: Boolean(budgetAlertText),
    iosInstall: showIosInstallBanner,
    backup: showBackupBanner,
  });

  const handleDismissReminder = () => {
    writeDismissedReminderDate(live.today);
    setDismissedReminderDate(live.today);
  };

  const handleBackupNow = async () => {
    const nowIso = `${live.today}T${new Date().toISOString().slice(11)}`;
    const json = await exportToJson(nowIso);
    downloadBlob(
      json,
      `tanggal-tua-backup-${live.today}.json`,
      'application/json;charset=utf-8'
    );
    showToast({ message: 'Cadangan JSON berhasil diunduh' });
  };

  const handleSnoozeBackup = async () => {
    await updateSettings({ backupSnoozeUntil: addDays(live.today, 7) });
  };

  const handleDismissIosHint = async () => {
    await updateSettings({ iosHintDismissed: true });
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = tplLabel.trim();
    if (!trimmedLabel) {
      setTplError('Nama template wajib diisi, mis. Kopi kampus');
      return;
    }

    const parsedAmount = parseNominalInput(tplAmountRaw);
    if (!parsedAmount || !isValidAmount(parsedAmount)) {
      setTplError('Masukkan nominal yang wajar, mis. 12rb atau 12000');
      return;
    }

    await createTemplate({
      label: trimmedLabel,
      amount: parsedAmount,
      categoryId: tplCategoryId,
    });

    setTplLabel('');
    setTplAmountRaw('');
    setTplError(null);
    setIsAddTemplateOpen(false);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-2">
        <Wordmark mood={live.homeState.mood} asHeading />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            data-testid="streak-pill"
            onClick={() => setIsStreakOpen(true)}
            aria-label={`Streak mencatat ${live.streak.currentStreak} hari`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--border-control)] bg-[var(--surface)] px-3.5 text-[13px] font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
          >
            <Flame
              size={15}
              strokeWidth={2.3}
              className="shrink-0 text-[var(--primary)]"
              aria-hidden="true"
            />
            <span className="tabular-nums whitespace-nowrap">
              {live.streak.currentStreak} hari
            </span>
          </button>
          <button
            type="button"
            onClick={() => openTransactionSheet({ defaultType: 'expense' })}
            aria-label="Tambah transaksi lengkap"
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
          >
            <Plus size={20} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>
      </header>

      <HeroCard
        today={live.today}
        nextPayday={live.settings.nextPayday}
        homeState={live.homeState}
        showPaydayBanner={activeBanner === 'payday'}
        onConfigurePayday={() => navigate('/pengaturan')}
        onRecordIncome={() => openTransactionSheet({ defaultType: 'income' })}
      />

      {activeBanner === 'reminder' && (
        <section
          aria-label="Pengingat catat harian"
          data-testid="home-reminder-banner"
          className="mt-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Bell size={16} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-[var(--primary)]" />
              <p className="text-[14px] font-extrabold text-[var(--ink)]">
                Sudah catat jajan hari ini?
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissReminder}
              aria-label="Tutup pengingat hari ini"
              className="-mr-1.5 -mt-1.5 inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => quickAddInputRef.current?.focus()}
              style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
              className="min-h-[44px] rounded-[14px] px-4 text-[13px] font-extrabold"
            >
              Catat
            </button>
            <button
              type="button"
              onClick={() =>
                void markNoSpendTodayWithEffects({
                  transactions: live.transactions,
                  dayMarks: live.dayMarks,
                  lastCelebratedStreak: live.settings.lastCelebratedStreak,
                  today: live.today,
                })
              }
              className="min-h-[44px] rounded-[14px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[13px] font-bold text-[var(--ink)]"
            >
              Hari ini tidak ada pengeluaran
            </button>
          </div>
        </section>
      )}

      {activeBanner === 'budget' && budgetAlertText && (
        <Link
          to="/anggaran"
          data-testid="home-budget-alert"
          style={{
            backgroundColor: hasHabisBudget
              ? 'var(--status-habis-bg)'
              : 'var(--status-hampir-bg)',
            color: hasHabisBudget ? 'var(--warm-ink)' : 'var(--status-hampir)',
          }}
          className="mt-2.5 flex min-h-[44px] items-center gap-2 rounded-[16px] px-3.5 py-2 text-[13px] font-extrabold transition-opacity hover:opacity-90"
        >
          <AlertCircle size={16} strokeWidth={2.3} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{budgetAlertText}</span>
        </Link>
      )}

      {activeBanner === 'ios-install' && (
        <section
          aria-label="Panduan pasang aplikasi di iPhone"
          data-testid="home-ios-install-banner"
          className="mt-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-extrabold text-[var(--ink)]">
              Pasang ke Layar Utama
            </p>
            <button
              type="button"
              onClick={() => void handleDismissIosHint()}
              aria-label="Tutup panduan instal iPhone"
              className="-mr-1.5 -mt-1.5 inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1.5">
            <IosInstallGuide compact />
          </div>
        </section>
      )}

      {activeBanner === 'backup' && (
        <section
          aria-label="Pengingat cadangan data"
          data-testid="home-backup-banner"
          className="mt-2.5 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <Download size={16} strokeWidth={2.2} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--primary)]" />
            <p className="text-[13px] font-bold text-[var(--ink)]">
              Sudah 30 hari sejak cadangan terakhir. Unduh cadangan biar datamu aman.
            </p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleBackupNow()}
              style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
              className="min-h-[44px] rounded-[14px] px-4 text-[13px] font-extrabold"
            >
              Unduh cadangan
            </button>
            <button
              type="button"
              onClick={() => void handleSnoozeBackup()}
              className="min-h-[44px] rounded-[14px] border border-[var(--border-control)] bg-[var(--bg)] px-4 text-[13px] font-bold text-[var(--ink)]"
            >
              Nanti
            </button>
          </div>
        </section>
      )}

      <QuickChips
        templates={live.topTemplates}
        today={live.today}
        transactions={live.transactions}
        dayMarks={live.dayMarks}
        budgets={live.budgets}
        categoryMap={live.categoryMap}
        lastCelebratedStreak={live.settings.lastCelebratedStreak}
        onAddTemplateClick={() => {
          setTplError(null);
          setIsAddTemplateOpen(true);
        }}
      />

      <TodayList
        transactions={live.todayTransactions}
        categoryMap={live.categoryMap}
        goalIds={new Set(live.goals.map((g) => g.id))}
        onSelectTransaction={(tx) => {
          const goalIds = new Set(live.goals.map((g) => g.id));
          if (isLinkedGoalTransaction(tx, goalIds)) {
            showToast({ message: GOAL_TX_LOCKED_MESSAGE });
            return;
          }
          openTransactionSheet({ transactionId: tx.id });
        }}
      />

      {primaryGoal && (
        <Link
          to={`/target/${primaryGoal.id}`}
          data-testid="home-goal-row"
          className="mt-3 block rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--primary)]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Target size={16} strokeWidth={2.2} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <span className="truncate text-[14px] font-extrabold text-[var(--ink)]">
                {primaryGoal.name}
              </span>
            </div>
            <span className="tabular-nums shrink-0 text-[12px] font-bold text-[var(--muted)]">
              {formatHeroShort(primaryGoalSaved)} dari{' '}
              {formatHeroShort(primaryGoal.targetAmount)}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              usedRatio={Math.min(1, primaryGoalSaved / primaryGoal.targetAmount)}
            />
          </div>
        </Link>
      )}

      <QuickAddBar
        inputRef={quickAddInputRef}
        today={live.today}
        openingDate={live.settings.openingDate}
        categories={live.categories}
        categoryMap={live.categoryMap}
        transactions={live.transactions}
        dayMarks={live.dayMarks}
        budgets={live.budgets}
        lastCelebratedStreak={live.settings.lastCelebratedStreak}
      />

      <StreakSheet
        open={isStreakOpen}
        onClose={() => setIsStreakOpen(false)}
        streak={live.streak}
        hasTodayNoSpendMark={live.dayMarks.some((m) => m.date === live.today)}
        onMarkNoSpendToday={() =>
          markNoSpendTodayWithEffects({
            transactions: live.transactions,
            dayMarks: live.dayMarks,
            lastCelebratedStreak: live.settings.lastCelebratedStreak,
            today: live.today,
          })
        }
        onRemoveNoSpendToday={async () => {
          await removeDayMark(live.today);
          showToast({
            message: 'Penanda hari tanpa pengeluaran dihapus',
            onUndo: async () => {
              await markNoSpendDay(live.today);
            },
          });
        }}
      />

      <Sheet
        open={isAddTemplateOpen}
        onClose={() => setIsAddTemplateOpen(false)}
        title="Tambah Template Cepat"
      >
        <form onSubmit={(e) => void handleCreateTemplate(e)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="tpl-label-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nama pengeluaran
            </label>
            <input
              id="tpl-label-input"
              type="text"
              value={tplLabel}
              onChange={(e) => {
                setTplLabel(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: Kopi susu"
              maxLength={40}
              required
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="tpl-amount-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal (Rupiah)
            </label>
            <input
              id="tpl-amount-input"
              type="text"
              inputMode="numeric"
              value={tplAmountRaw}
              onChange={(e) => {
                setTplAmountRaw(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: 15rb atau 15000"
              required
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="tpl-category-select"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Kategori
            </label>
            <select
              id="tpl-category-select"
              value={tplCategoryId}
              onChange={(e) => setTplCategoryId(e.target.value)}
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {tplError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {tplError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddTemplateOpen(false)}
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
              Simpan template
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
