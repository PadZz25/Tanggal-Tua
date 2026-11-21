import { getIsoWeekday, parseDateParts, rollPayday, today } from '../../domain/dates';
import type {
  PaydayRepeat,
  PaydayWeekday,
  Settings,
  ThemePreference,
} from '../../domain/types';
import { normalizeThemePreference } from '../../hooks/useTheme';
import { db } from '../db';
import { createDefaultSettings, ensureSeeded } from '../seed';

function normalizeWeekday(value: unknown): PaydayWeekday | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7) {
    return value as PaydayWeekday;
  }
  return null;
}

export function normalizeSettings(
  row: Partial<Settings> | undefined,
  currentToday: string = today()
): Settings {
  const defaults = createDefaultSettings(currentToday);
  if (!row) return defaults;

  const mergedRaw: Settings = { ...defaults, ...row };
  const resolvedNextPayday =
    typeof row.nextPayday === 'string' && row.nextPayday
      ? row.nextPayday
      : defaults.nextPayday;

  const resolvedPaydayDay =
    'paydayDay' in row
      ? typeof row.paydayDay === 'number' &&
        Number.isInteger(row.paydayDay) &&
        row.paydayDay >= 1 &&
        row.paydayDay <= 31
        ? row.paydayDay
        : null
      : defaults.paydayDay;

  let resolvedRepeat: PaydayRepeat;
  if (
    row.paydayRepeat === 'none' ||
    row.paydayRepeat === 'monthly' ||
    row.paydayRepeat === 'weekly'
  ) {
    resolvedRepeat = row.paydayRepeat;
  } else {
    resolvedRepeat = resolvedPaydayDay !== null ? 'monthly' : 'none';
  }

  let resolvedWeekday = normalizeWeekday(row.paydayWeekday);
  if (resolvedRepeat === 'weekly' && resolvedWeekday === null) {
    resolvedWeekday = getIsoWeekday(resolvedNextPayday);
  }

  const finalPaydayDay =
    resolvedRepeat === 'monthly' && resolvedPaydayDay === null
      ? parseDateParts(resolvedNextPayday).day
      : resolvedRepeat === 'monthly'
        ? resolvedPaydayDay
        : null;

  return {
    ...mergedRaw,
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
    nextPayday: resolvedNextPayday,
    paydayRepeat: resolvedRepeat,
    paydayDay: finalPaydayDay,
    paydayWeekday: resolvedRepeat === 'weekly' ? resolvedWeekday : null,
    tanggalTuaThreshold:
      typeof row.tanggalTuaThreshold === 'number' &&
      Number.isFinite(row.tanggalTuaThreshold)
        ? row.tanggalTuaThreshold
        : defaults.tanggalTuaThreshold,
  };
}

export const mergeWithDefaultSettings = normalizeSettings;

export async function getSettings(currentToday: string = today()): Promise<Settings> {
  const existing = await db.settings.get('main');
  if (existing) {
    return normalizeSettings(existing, currentToday);
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
    const merged = normalizeSettings(sanitizedPatch);
    await db.settings.put(merged);
    return merged;
  }

  const fresh = await db.settings.get('main');
  return normalizeSettings(fresh);
}

export async function completeOnboarding(params: {
  openingBalance: number;
  openingDate: string;
  nextPayday: string;
  paydayDay: number | null;
  paydayRepeat?: PaydayRepeat;
  paydayWeekday?: PaydayWeekday | null;
  theme: ThemePreference;
}): Promise<Settings> {
  await ensureSeeded(params.openingDate);
  const paydayRepeat: PaydayRepeat =
    params.paydayRepeat ?? (params.paydayDay !== null ? 'monthly' : 'none');

  return updateSettings({
    hasOnboarded: true,
    openingBalance: params.openingBalance,
    openingDate: params.openingDate,
    nextPayday: params.nextPayday,
    paydayRepeat,
    paydayDay: paydayRepeat === 'monthly' ? params.paydayDay : null,
    paydayWeekday: paydayRepeat === 'weekly' ? (params.paydayWeekday ?? null) : null,
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

  const result = rollPayday(currentToday, settings.nextPayday, {
    paydayRepeat: settings.paydayRepeat,
    paydayDay: settings.paydayDay,
    paydayWeekday: settings.paydayWeekday,
  });
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
