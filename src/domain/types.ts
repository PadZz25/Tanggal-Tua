export type TransactionType = 'expense' | 'income' | 'adjustment';

export type TransactionSource = 'quick' | 'form' | 'template' | 'voice';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
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
}

export interface Template {
  id: string;
  label: string;
  amount: number;
  categoryId: string;
  order: number;
  usageCount: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  id: 'main';
  schemaVersion: number;
  hasOnboarded: boolean;
  openingBalance: number;
  openingDate: string;
  nextPayday: string;
  paydayDay: number | null;
  tanggalTuaThreshold: number;
  theme: ThemePreference;
  lastExportAt: string | null;
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
