import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { checkAndRollPayday } from '../data/repositories/settings';
import { sortTopTemplates } from '../data/repositories/templates';
import { createDefaultSettings, ensureSeeded } from '../data/seed';
import { computeBalances, getHomeState } from '../domain/allowance';
import type {
  Category,
  HomeStateResult,
  Settings,
  Template,
  Transaction,
} from '../domain/types';
import { useToday } from './useToday';
import { useUIStore } from './useUIStore';

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
  homeState: HomeStateResult;
}

export function useHomeState(): AppLiveState {
  const currentToday = useToday();
  const pendingDeleteIds = useUIStore((s) => s.pendingDeleteIds);
  const setPaydayRolledBanner = useUIStore((s) => s.setPaydayRolledBanner);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ensureSeeded(currentToday)
      .then(() => checkAndRollPayday(currentToday))
      .then((res) => {
        if (active && res.rolled) {
          setPaydayRolledBanner(true);
        }
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
    };
  }, [currentToday, setPaydayRolledBanner]);

  const queryData = useLiveQuery(async () => {
    const [settings, categories, templates, allTransactions] = await Promise.all([
      db.settings.get('main'),
      db.categories.orderBy('order').toArray(),
      db.templates.orderBy('order').toArray(),
      db.transactions.toArray(),
    ]);

    return {
      settings: settings ?? createDefaultSettings(currentToday),
      categories,
      templates,
      allTransactions,
    };
  }, [currentToday]);

  const isLoading = queryData === undefined && initError === null;
  const settings = queryData?.settings ?? createDefaultSettings(currentToday);
  const categories = queryData?.categories ?? [];
  const templates = queryData?.templates ?? [];

  const visibleTransactions = (queryData?.allTransactions ?? [])
    .filter((tx) => !pendingDeleteIds.includes(tx.id))
    .sort((a, b) => {
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
    homeState,
  };
}
