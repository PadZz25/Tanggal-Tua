import { CURRENT_SCHEMA_VERSION, db } from './db';
import { getAllBudgets } from './repositories/budgets';
import { getAllCategories } from './repositories/categories';
import { getAllDayMarks } from './repositories/dayMarks';
import { getAllGoals } from './repositories/goals';
import {
  getSettings,
  normalizeSettings,
  updateSettings,
} from './repositories/settings';
import { getAllTemplates } from './repositories/templates';
import { getAllTransactions } from './repositories/transactions';
import { ExportPayloadSchema, type ExportPayload } from './schemas';
import { ensureSeeded } from './seed';

export const UTF8_BOM = '\uFEFF';
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export type ImportMode = 'merge' | 'replace';

export async function exportToJson(nowIso: string = new Date().toISOString()): Promise<string> {
  await ensureSeeded();
  const updatedSettings = await updateSettings({ lastExportAt: nowIso });
  const [categories, templates, transactions, goals, dayMarks, budgets] = await Promise.all([
    getAllCategories(),
    getAllTemplates(),
    getAllTransactions(),
    getAllGoals(),
    getAllDayMarks(),
    getAllBudgets(),
  ]);

  const payload: ExportPayload = {
    app: 'tanggal-tua',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: nowIso,
    settings: { ...updatedSettings, schemaVersion: CURRENT_SCHEMA_VERSION },
    categories,
    templates,
    transactions,
    goals,
    dayMarks,
    budgets,
  };

  return JSON.stringify(payload, null, 2);
}

function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return String(value);
  }
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function exportToCsv(): Promise<string> {
  await ensureSeeded();
  const [categories, transactions] = await Promise.all([
    getAllCategories(),
    getAllTransactions(),
  ]);

  const categoryNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const rows: string[] = ['date,type,amount,category,note,linked'];

  for (const tx of transactions) {
    const categoryName =
      tx.type === 'adjustment'
        ? 'Koreksi saldo'
        : (tx.categoryId && categoryNameMap.get(tx.categoryId)) || 'Lainnya';

    rows.push(
      [
        escapeCsvCell(tx.date),
        escapeCsvCell(tx.type),
        escapeCsvCell(tx.amount),
        escapeCsvCell(categoryName),
        escapeCsvCell(tx.note),
        escapeCsvCell(tx.goalId ? 'ya' : 'tidak'),
      ].join(',')
    );
  }

  return UTF8_BOM + rows.join('\r\n');
}

export async function importFromJson(
  rawJson: string,
  mode: ImportMode
): Promise<{ importedTransactions: number }> {
  if (rawJson.length > MAX_IMPORT_BYTES) {
    throw new Error('Ukuran berkas melebihi batas maksimal 10 MB.');
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(rawJson);
  } catch {
    throw new Error('Format JSON tidak valid.');
  }

  const validation = ExportPayloadSchema.safeParse(parsedRaw);
  if (!validation.success) {
    throw new Error('Struktur data berkas cadangan tidak sesuai.');
  }

  const payload = validation.data;
  let importedTransactions = 0;

  await db.transaction(
    'rw',
    [
      db.settings,
      db.categories,
      db.templates,
      db.transactions,
      db.goals,
      db.dayMarks,
      db.budgets,
    ],
    async () => {
      if (mode === 'replace') {
        await db.transactions.clear();
        await db.templates.clear();
        await db.categories.clear();
        await db.settings.clear();
        await db.goals.clear();
        await db.dayMarks.clear();
        await db.budgets.clear();

        await db.settings.put(
          normalizeSettings({
            ...payload.settings,
            id: 'main',
            schemaVersion: CURRENT_SCHEMA_VERSION,
          })
        );
        if (payload.categories.length > 0) {
          await db.categories.bulkPut(payload.categories);
        }
        if (payload.templates.length > 0) {
          await db.templates.bulkPut(payload.templates);
        }
        if (payload.transactions.length > 0) {
          await db.transactions.bulkPut(payload.transactions);
        }
        if (payload.goals.length > 0) {
          await db.goals.bulkPut(payload.goals);
        }
        if (payload.dayMarks.length > 0) {
          await db.dayMarks.bulkPut(payload.dayMarks);
        }
        if (payload.budgets.length > 0) {
          await db.budgets.bulkPut(payload.budgets);
        }
        importedTransactions = payload.transactions.length;
      } else {
        const currentSettings = await getSettings();
        if (!currentSettings.hasOnboarded && payload.settings.hasOnboarded) {
          await db.settings.put(
            normalizeSettings({
              ...payload.settings,
              id: 'main',
              schemaVersion: CURRENT_SCHEMA_VERSION,
            })
          );
        }

        const existingCategoryIds = new Set(
          (await db.categories.toCollection().primaryKeys()) as string[]
        );
        const newCategories = payload.categories.filter((c) => !existingCategoryIds.has(c.id));
        if (newCategories.length > 0) {
          await db.categories.bulkPut(newCategories);
        }

        const existingTemplateIds = new Set(
          (await db.templates.toCollection().primaryKeys()) as string[]
        );
        const newTemplates = payload.templates.filter((t) => !existingTemplateIds.has(t.id));
        if (newTemplates.length > 0) {
          await db.templates.bulkPut(newTemplates);
        }

        const existingTxIds = new Set(
          (await db.transactions.toCollection().primaryKeys()) as string[]
        );
        const newTransactions = payload.transactions.filter((tx) => !existingTxIds.has(tx.id));
        if (newTransactions.length > 0) {
          await db.transactions.bulkPut(newTransactions);
        }

        const existingGoalIds = new Set(
          (await db.goals.toCollection().primaryKeys()) as string[]
        );
        const newGoals = payload.goals.filter((g) => !existingGoalIds.has(g.id));
        if (newGoals.length > 0) {
          await db.goals.bulkPut(newGoals);
        }

        const existingMarkDates = new Set(
          (await db.dayMarks.toCollection().primaryKeys()) as string[]
        );
        const newMarks = payload.dayMarks.filter((m) => !existingMarkDates.has(m.date));
        if (newMarks.length > 0) {
          await db.dayMarks.bulkPut(newMarks);
        }

        const existingBudgetCats = new Set(
          (await db.budgets.toCollection().primaryKeys()) as string[]
        );
        const newBudgets = payload.budgets.filter(
          (b) => !existingBudgetCats.has(b.categoryId)
        );
        if (newBudgets.length > 0) {
          await db.budgets.bulkPut(newBudgets);
        }

        importedTransactions = newTransactions.length;
      }
    }
  );

  await ensureSeeded();
  return { importedTransactions };
}
