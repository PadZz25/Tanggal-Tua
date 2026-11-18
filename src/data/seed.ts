import { DEFAULT_TANGGAL_TUA_THRESHOLD } from '../domain/allowance';
import { defaultNextPayday, today } from '../domain/dates';
import { DEFAULT_CATEGORIES } from '../domain/parser/keywords';
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
    paydayDay: 1,
    tanggalTuaThreshold: DEFAULT_TANGGAL_TUA_THRESHOLD,
    theme: 'system',
    lastExportAt: null,
  };
}

export async function ensureSeeded(currentToday: string = today()): Promise<void> {
  await db.transaction('rw', db.categories, db.templates, db.settings, async () => {
    const categoryCount = await db.categories.count();
    if (categoryCount === 0) {
      await db.categories.bulkPut(DEFAULT_CATEGORIES);
    }

    const templateCount = await db.templates.count();
    if (templateCount === 0) {
      await db.templates.bulkPut(DEFAULT_TEMPLATES);
    }

    const mainSettings = await db.settings.get('main');
    if (!mainSettings) {
      await db.settings.put(createDefaultSettings(currentToday));
    }
  });
}
