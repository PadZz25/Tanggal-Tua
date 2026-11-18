import { rollPayday, today } from '../../domain/dates';
import type { Settings, ThemePreference } from '../../domain/types';
import { normalizeThemePreference } from '../../hooks/useTheme';
import { db } from '../db';
import { createDefaultSettings, ensureSeeded } from '../seed';

export function mergeWithDefaultSettings(
  row: Partial<Settings> | undefined,
  currentToday: string = today()
): Settings {
  const defaults = createDefaultSettings(currentToday);
  if (!row) return defaults;

  return {
    ...defaults,
    ...row,
    id: 'main',
    theme: normalizeThemePreference(row.theme ?? defaults.theme),
    hasOnboarded:
      typeof row.hasOnboarded === 'boolean' ? row.hasOnboarded : defaults.hasOnboarded,
    openingBalance:
      typeof row.openingBalance === 'number' && Number.isFinite(row.openingBalance)
        ? row.openingBalance
        : defaults.openingBalance,
    openingDate:
      typeof row.openingDate === 'string' && row.openingDate
        ? row.openingDate
        : defaults.openingDate,
    nextPayday:
      typeof row.nextPayday === 'string' && row.nextPayday
        ? row.nextPayday
        : defaults.nextPayday,
    tanggalTuaThreshold:
      typeof row.tanggalTuaThreshold === 'number' &&
      Number.isFinite(row.tanggalTuaThreshold)
        ? row.tanggalTuaThreshold
        : defaults.tanggalTuaThreshold,
  };
}

export async function getSettings(currentToday: string = today()): Promise<Settings> {
  const existing = await db.settings.get('main');
  if (existing) {
    return mergeWithDefaultSettings(existing, currentToday);
  }
  const fallback = createDefaultSettings(currentToday);
  await db.settings.put(fallback);
  return fallback;
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id'>>
): Promise<Settings> {
  const sanitizedPatch: Partial<Omit<Settings, 'id'>> = { ...patch };
  if (sanitizedPatch.theme !== undefined) {
    sanitizedPatch.theme = normalizeThemePreference(sanitizedPatch.theme);
  }

  const updatedCount = await db.settings.update('main', sanitizedPatch);
  if (updatedCount === 0) {
    const merged = mergeWithDefaultSettings(sanitizedPatch);
    await db.settings.put(merged);
    return merged;
  }

  const fresh = await db.settings.get('main');
  return mergeWithDefaultSettings(fresh);
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
    theme: normalizeThemePreference(params.theme),
  });
}

export async function checkAndRollPayday(
  currentToday: string = today()
): Promise<{ rolled: boolean; settings: Settings }> {
  const settings = await getSettings(currentToday);
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
