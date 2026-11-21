import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, openDatabaseSafely } from '../data/db';
import {
  checkAndRollPayday,
  mergeWithDefaultSettings,
} from '../data/repositories/settings';
import { sortTopTemplates } from '../data/repositories/templates';
import { DEFAULT_TEMPLATES, ensureSeeded } from '../data/seed';
import { computeBalances, getHomeState } from '../domain/allowance';
import { ALL_DEFAULT_CATEGORIES } from '../domain/parser/keywords';
import type {
  Budget,
  Category,
  DayMark,
  Goal,
  HomeStateResult,
  Settings,
  Template,
  Transaction,
} from '../domain/types';
import { useToday } from './useToday';
import { useUIStore } from './useUIStore';

export const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 5_000;

export interface LoadedAppSnapshot {
  settings: Settings;
  categories: Category[];
  templates: Template[];
  allTransactions: Transaction[];
  goals: Goal[];
  dayMarks: DayMark[];
  budgets: Budget[];
  hasSettingsRow: boolean;
}

export async function loadAppSnapshot(currentToday: string): Promise<LoadedAppSnapshot> {
  await openDatabaseSafely();

  const [
    rawSettings,
    rawCategories,
    rawTemplates,
    allTransactions,
    goals,
    dayMarks,
    budgets,
  ] = await Promise.all([
    db.settings.get('main'),
    db.categories.orderBy('order').toArray(),
    db.templates.orderBy('order').toArray(),
    db.transactions.toArray(),
    db.goals.toArray(),
    db.dayMarks.toArray(),
    db.budgets.toArray(),
  ]);

  return {
    settings: mergeWithDefaultSettings(rawSettings, currentToday),
    categories: rawCategories.length > 0 ? rawCategories : ALL_DEFAULT_CATEGORIES,
    templates: rawTemplates.length > 0 ? rawTemplates : DEFAULT_TEMPLATES,
    allTransactions,
    goals,
    dayMarks,
    budgets,
    hasSettingsRow: rawSettings !== undefined,
  };
}

export interface AppLiveState {
  isLoading: boolean;
  error: string | null;
  today: string;
  settings: Settings;
  categories: Category[];
  categoryMap: Map<string, Category>;
  templates: Template[];
  topTemplates: Template[];
  transactions: Transaction[];
  todayTransactions: Transaction[];
  goals: Goal[];
  dayMarks: DayMark[];
  budgets: Budget[];
  homeState: HomeStateResult;
}

export function useHomeState(): AppLiveState {
  const currentToday = useToday();
  const setPaydayRolledBanner = useUIStore((s) => s.setPaydayRolledBanner);
  const [initError, setInitError] = useState<string | null>(null);
  const [bootstrapReady, setBootstrapReady] = useState(false);

  useEffect(() => {
    let active = true;

    const handleBlocked = (e: Event) => {
      if (!active) return;
      const detail = (e as CustomEvent<string>).detail;
      setInitError(
        detail ||
          'Database lokal sedang terkunci oleh tab lain. Tutup tab lain atau muat ulang.'
      );
    };

    window.addEventListener('tanggal-tua-db-blocked', handleBlocked);

    openDatabaseSafely()
      .then(() => ensureSeeded(currentToday))
      .then(() => checkAndRollPayday(currentToday))
      .then((res) => {
        if (!active) return;
        if (res.rolled) {
          setPaydayRolledBanner(true);
        }
        setBootstrapReady(true);
      })
      .catch((err: unknown) => {
        if (active) {
          setInitError(
            err instanceof Error
              ? err.message
              : 'Gagal mengakses penyimpanan lokal browser.'
          );
        }
      });

    return () => {
      active = false;
      window.removeEventListener('tanggal-tua-db-blocked', handleBlocked);
    };
  }, [currentToday, setPaydayRolledBanner]);

  const queryData = useLiveQuery(async () => {
    try {
      return await loadAppSnapshot(currentToday);
    } catch (err: unknown) {
      setInitError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca data dari penyimpanan lokal.'
      );
      return null;
    }
  }, [currentToday]);

  const isLoading = queryData === undefined && !bootstrapReady && initError === null;

  useEffect(() => {
    if (!isLoading || initError !== null) return;

    const timeoutMs =
      (typeof window !== 'undefined' && window.__TANGGAL_TUA_BOOTSTRAP_TIMEOUT_MS__) ||
      DEFAULT_BOOTSTRAP_TIMEOUT_MS;

    const timer = window.setTimeout(() => {
      setInitError(
        'Waktu memuat aplikasi habis (lebih dari 5 detik). Penyimpanan lokal mungkin sedang terkunci atau cache perlu disegarkan.'
      );
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [isLoading, initError]);

  const settings = mergeWithDefaultSettings(queryData?.settings, currentToday);
  const categories =
    queryData?.categories && queryData.categories.length > 0
      ? queryData.categories
      : ALL_DEFAULT_CATEGORIES;
  const templates =
    queryData?.templates && queryData.templates.length > 0
      ? queryData.templates
      : DEFAULT_TEMPLATES;

  const visibleTransactions = (queryData?.allTransactions ?? []).sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.occurredAt.localeCompare(a.occurredAt);
  });

  const todayTransactions = visibleTransactions.filter((tx) => tx.date === currentToday);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const topTemplates = sortTopTemplates(templates, 3);

  const { currentBalance, spentToday } = computeBalances({
    openingBalance: settings.openingBalance,
    openingDate: settings.openingDate,
    today: currentToday,
    transactions: visibleTransactions,
  });

  const homeState = getHomeState({
    today: currentToday,
    nextPayday: settings.nextPayday,
    currentBalance,
    spentToday,
    tanggalTuaThreshold: settings.tanggalTuaThreshold,
  });

  return {
    isLoading,
    error: initError,
    today: currentToday,
    settings,
    categories,
    categoryMap,
    templates,
    topTemplates,
    transactions: visibleTransactions,
    todayTransactions,
    goals: queryData?.goals ?? [],
    dayMarks: queryData?.dayMarks ?? [],
    budgets: queryData?.budgets ?? [],
    homeState,
  };
}
