import { DEFAULT_TANGGAL_TUA_THRESHOLD } from '../domain/allowance';
import { defaultNextPayday, today } from '../domain/dates';
import { ALL_DEFAULT_CATEGORIES, SYSTEM_CATEGORIES } from '../domain/parser/keywords';
import type { Settings, Template } from '../domain/types';
import { CURRENT_SCHEMA_VERSION, db } from './db';

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-kopi',
    label: 'Kopi',
    amount: 12_000,
    categoryId: 'cat-jajan',
    order: 1,
    usageCount: 0,
  },
  {
    id: 'tpl-parkir',
    label: 'Parkir',
    amount: 2_000,
    categoryId: 'cat-transport',
    order: 2,
    usageCount: 0,
  },
  {
    id: 'tpl-makan',
    label: 'Makan',
    amount: 15_000,
    categoryId: 'cat-makan',
    order: 3,
    usageCount: 0,
  },
];

export function createDefaultSettings(currentToday: string = today()): Settings {
  return {
    id: 'main',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    hasOnboarded: false,
    openingBalance: 0,
    openingDate: currentToday,
    nextPayday: defaultNextPayday(currentToday),
    paydayRepeat: 'monthly',
    paydayDay: 1,
    paydayWeekday: null,
    tanggalTuaThreshold: DEFAULT_TANGGAL_TUA_THRESHOLD,
    theme: 'system',
    lastExportAt: null,
    reminderEnabled: false,
    reminderTime: '20:00',
    lastCelebratedStreak: 0,
    backupSnoozeUntil: null,
    iosHintDismissed: false,
  };
}

export async function ensureSeeded(currentToday: string = today()): Promise<void> {
  await db.transaction('rw', db.categories, db.templates, db.settings, async () => {
    const categoryCount = await db.categories.count();
    if (categoryCount === 0) {
      await db.categories.bulkPut(ALL_DEFAULT_CATEGORIES);
    } else {
      for (const sysCat of SYSTEM_CATEGORIES) {
        const existing = await db.categories.get(sysCat.id);
        if (!existing) {
          await db.categories.put(sysCat);
        } else if (!existing.isSystem) {
          await db.categories.put({ ...existing, isSystem: true });
        }
      }
    }

    const mainSettings = await db.settings.get('main');
    const templateCount = await db.templates.count();
    if (!mainSettings && templateCount === 0) {
      await db.templates.bulkPut(DEFAULT_TEMPLATES);
    }

    if (!mainSettings) {
      await db.settings.put(createDefaultSettings(currentToday));
    }
  });
}
