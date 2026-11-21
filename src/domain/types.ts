export type TransactionType = 'expense' | 'income' | 'adjustment';

export type TransactionSource = 'quick' | 'form' | 'template' | 'voice';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  goalId: string | null;
  note: string;
  date: string;
  occurredAt: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  tone: string;
  keywords: string[];
  order: number;
  isDefault: boolean;
  isSystem: boolean;
}

export interface Template {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
  order: number;
  usageCount: number;
}

export type GoalStatus = 'active' | 'completed' | 'archived';

export type GoalMilestone = 0 | 25 | 50 | 75 | 100;

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  startDate: string;
  deadline: string;
  status: GoalStatus;
  lastMilestone: GoalMilestone;
  createdAt: string;
}

export type DayMarkKind = 'no_spend';

export interface DayMark {
  date: string;
  kind: DayMarkKind;
  createdAt: string;
}

export type BudgetPeriod = 'week' | 'month';

export interface Budget {
  categoryId: string;
  period: BudgetPeriod;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type PaydayRepeat = 'none' | 'monthly' | 'weekly';

export type PaydayWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Settings {
  id: 'main';
  schemaVersion: number;
  hasOnboarded: boolean;
  openingBalance: number;
  openingDate: string;
  nextPayday: string;
  paydayRepeat: PaydayRepeat;
  paydayDay: number | null;
  paydayWeekday: PaydayWeekday | null;
  tanggalTuaThreshold: number;
  theme: ThemePreference;
  lastExportAt: string | null;
  reminderEnabled: boolean;
  reminderTime: string;
  lastCelebratedStreak: number;
  backupSnoozeUntil: string | null;
  iosHintDismissed: boolean;
}

export interface Person {
  id: string;
  name: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  personId: string;
  direction: 'owed_to_me' | 'i_owe';
  amount: number;
  note: string;
  createdAt: string;
  settledAt: string | null;
}

export type HomeStateKind =
  | 'payday-needed'
  | 'broke'
  | 'over'
  | 'tanggal-tua'
  | 'fresh'
  | 'normal';

export type MascotMood = 'smile' | 'flat' | 'oops' | 'sleepy';

export interface AllowanceCalculation {
  dailyAllowance: number;
  remainingToday: number;
  usedRatio: number;
}

export interface HomeStateResult extends AllowanceCalculation {
  state: HomeStateKind;
  mood: MascotMood;
  daysLeft: number;
  currentBalance: number;
  spentToday: number;
}

export type ParseErrorCode =
  | 'EMPTY'
  | 'NO_AMOUNT'
  | 'INVALID_AMOUNT'
  | 'MULTIPLE_AMOUNTS'
  | 'OUT_OF_RANGE'
  | 'BEFORE_OPENING_DATE';

export type ParseResult =
  | {
      ok: true;
      type: 'expense' | 'income';
      amount: number;
      note: string;
      categoryId: string;
      date: string;
    }
  | {
      ok: false;
      error: ParseErrorCode;
      hint: string;
    };
