import { rollPayday, today } from '../../domain/dates';
import type { Settings, ThemePreference } from '../../domain/types';
import { db } from '../db';
import { createDefaultSettings, ensureSeeded } from '../seed';

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('main');
  if (existing) return existing;
  const fallback = createDefaultSettings();
  await db.settings.put(fallback);
  return fallback;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...patch, id: 'main' };
  await db.settings.put(updated);
  return updated;
}

export async function completeOnboarding(params: {
  openingBalance: number;
  openingDate: string;
  nextPayday: string;
  paydayDay: number | null;
  theme: ThemePreference;
}): Promise<Settings> {
  await ensureSeeded(params.openingDate);
  return updateSettings({
    hasOnboarded: true,
    openingBalance: params.openingBalance,
    openingDate: params.openingDate,
    nextPayday: params.nextPayday,
    paydayDay: params.paydayDay,
    theme: params.theme,
  });
}

export async function checkAndRollPayday(
  currentToday: string = today()
): Promise<{ rolled: boolean; settings: Settings }> {
  const settings = await getSettings();
  if (!settings.hasOnboarded) {
    return { rolled: false, settings };
  }

  const result = rollPayday(currentToday, settings.nextPayday, settings.paydayDay);
  if (!result.rolled) {
    return { rolled: false, settings };
  }

  const updated = await updateSettings({ nextPayday: result.nextPayday });
  return { rolled: true, settings: updated };
}

export async function resetAllData(currentToday: string = today()): Promise<void> {
  await db.transaction(
    'rw',
    [db.transactions, db.templates, db.categories, db.settings, db.people, db.debts],
    async () => {
      await db.transactions.clear();
      await db.templates.clear();
      await db.categories.clear();
      await db.settings.clear();
      await db.people.clear();
      await db.debts.clear();
    }
  );
  await ensureSeeded(currentToday);
}
