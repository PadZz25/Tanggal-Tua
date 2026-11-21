import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_DEFAULT_CATEGORIES,
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
  getSelectableCategories,
} from '../domain/parser/keywords';
import { db } from './db';
import { exportToCsv, exportToJson, importFromJson, UTF8_BOM } from './exportImport';
import { getAllBudgets } from './repositories/budgets';
import { getAllCategories } from './repositories/categories';
import { getAllDayMarks } from './repositories/dayMarks';
import { getAllGoals } from './repositories/goals';
import { completeOnboarding, getSettings, resetAllData } from './repositories/settings';
import {
  applyTemplateQuickTap,
  createTemplate,
  getAllTemplates,
  revertTemplateQuickTap,
  sortTopTemplates,
} from './repositories/templates';
import {
  createTransaction,
  getAllTransactions,
  updateTransaction,
} from './repositories/transactions';
import { BudgetSchema } from './schemas';
import { ensureSeeded } from './seed';

describe('Data layer & Export/Import (Milestone M2)', () => {
  beforeEach(async () => {
    await resetAllData('2026-11-18');
  });

  it('seeds default categories, 3 default templates, and default settings', async () => {
    await ensureSeeded('2026-11-18');
    const settings = await getSettings();
    const templates = await getAllTemplates();

    expect(settings.hasOnboarded).toBe(false);
    expect(settings.schemaVersion).toBe(2);
    expect(settings.tanggalTuaThreshold).toBe(30_000);
    expect(settings.reminderEnabled).toBe(false);
    expect(settings.reminderTime).toBe('20:00');
    expect(settings.lastCelebratedStreak).toBe(0);
    expect(settings.backupSnoozeUntil).toBeNull();
    expect(settings.iosHintDismissed).toBe(false);
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.label)).toEqual(['Kopi', 'Parkir', 'Makan']);

    const categories = await getAllCategories();
    const systemCats = categories.filter((c) => c.isSystem);
    expect(systemCats.map((c) => c.id).sort()).toEqual([
      SYSTEM_CATEGORY_SAVING_ID,
      SYSTEM_CATEGORY_WITHDRAW_ID,
    ]);
    expect(getSelectableCategories(ALL_DEFAULT_CATEGORIES, 'expense').some((c) => c.isSystem)).toBe(
      false
    );
    expect(getSelectableCategories(ALL_DEFAULT_CATEGORIES, 'income').some((c) => c.isSystem)).toBe(
      false
    );
    expect(() =>
      BudgetSchema.parse({
        categoryId: SYSTEM_CATEGORY_SAVING_ID,
        period: 'month',
        amount: 100_000,
        createdAt: '2026-11-18T00:00:00.000Z',
        updatedAt: '2026-11-18T00:00:00.000Z',
      })
    ).toThrow();
  });

  it('increments template usageCount and sorts top templates by usageCount then order', async () => {
    await applyTemplateQuickTap({ templateId: 'tpl-makan', date: '2026-11-18' });
    await applyTemplateQuickTap({ templateId: 'tpl-makan', date: '2026-11-18' });

    const allTemplates = await getAllTemplates();
    const top = sortTopTemplates(allTemplates, 3);
    expect(top[0].id).toBe('tpl-makan');
    expect(top[0].usageCount).toBe(2);
  });

  it('performs full JSON round-trip (replace and merge modes)', async () => {
    await completeOnboarding({
      openingBalance: 850_000,
      openingDate: '2026-11-18',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      theme: 'light',
    });

    const tx1 = await createTransaction({
      type: 'expense',
      amount: 18_000,
      categoryId: 'cat-jajan',
      note: 'Kopi susu',
      date: '2026-11-18',
      source: 'quick',
    });

    const exportedJson = await exportToJson('2026-11-18T10:00:00.000Z');
    const parsed = JSON.parse(exportedJson);
    expect(parsed.app).toBe('tanggal-tua');
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].goalId).toBeNull();
    expect(parsed.goals).toEqual([]);
    expect(parsed.dayMarks).toEqual([]);
    expect(parsed.budgets).toEqual([]);

    // Wipe everything and import back in 'replace' mode
    await resetAllData('2026-11-18');
    expect(await getAllTransactions()).toHaveLength(0);

    const replaceResult = await importFromJson(exportedJson, 'replace');
    expect(replaceResult.importedTransactions).toBe(1);

    const restoredSettings = await getSettings();
    const restoredTx = await getAllTransactions();
    expect(restoredSettings.openingBalance).toBe(850_000);
    expect(restoredTx).toHaveLength(1);
    expect(restoredTx[0].id).toBe(tx1.id);

    // Add a new local transaction, then re-import with 'merge' (should skip existing ID)
    await createTransaction({
      type: 'expense',
      amount: 2_000,
      categoryId: 'cat-transport',
      note: 'Parkir',
      date: '2026-11-18',
      source: 'template',
    });

    const mergeResult = await importFromJson(exportedJson, 'merge');
    expect(mergeResult.importedTransactions).toBe(0);
    expect(await getAllTransactions()).toHaveLength(2);
  });

  it('leaves existing database completely unchanged when importing corrupted or invalid JSON', async () => {
    await createTransaction({
      type: 'expense',
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Nasi warteg',
      date: '2026-11-18',
      source: 'quick',
    });

    await expect(importFromJson('{ broken json', 'replace')).rejects.toThrow(
      'Format JSON tidak valid.'
    );

    const invalidPayload = JSON.stringify({
      app: 'wrong-app',
      schemaVersion: 1,
    });
    await expect(importFromJson(invalidPayload, 'replace')).rejects.toThrow(
      'Struktur data berkas cadangan tidak sesuai.'
    );

    const remaining = await getAllTransactions();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].note).toBe('Nasi warteg');
  });

  it('exports CSV with UTF-8 BOM and properly escaped columns', async () => {
    await createTransaction({
      type: 'expense',
      amount: 18_000,
      categoryId: 'cat-jajan',
      note: 'Kopi, roti',
      date: '2026-11-18',
      source: 'quick',
    });
    await createTransaction({
      type: 'expense',
      amount: 50_000,
      categoryId: SYSTEM_CATEGORY_SAVING_ID,
      goalId: 'goal-1',
      note: 'Tabungan laptop',
      date: '2026-11-18',
      source: 'form',
    });

    const csv = await exportToCsv();
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toContain('date,type,amount,category,note,linked');
    expect(csv).toContain('2026-11-18,expense,18000,Jajan,"Kopi, roti",tidak');
    expect(csv).toContain('2026-11-18,expense,50000,Tabungan,Tabungan laptop,ya');
  });

  it('imports legacy v1 JSON exports without paydayRepeat/paydayWeekday and round-trips weekly schedule', async () => {
    const legacyMonthlyPayload = JSON.stringify({
      app: 'tanggal-tua',
      schemaVersion: 1,
      exportedAt: '2026-11-18T10:00:00.000Z',
      settings: {
        id: 'main',
        schemaVersion: 1,
        hasOnboarded: true,
        openingBalance: 500_000,
        openingDate: '2026-11-18',
        nextPayday: '2026-12-01',
        paydayDay: 1,
        tanggalTuaThreshold: 30_000,
        theme: 'light',
        lastExportAt: null,
      },
      categories: [],
      templates: [],
      transactions: [],
    });

    await importFromJson(legacyMonthlyPayload, 'replace');
    const monthlySettings = await getSettings('2026-11-18');
    expect(monthlySettings.paydayRepeat).toBe('monthly');
    expect(monthlySettings.paydayDay).toBe(1);
    expect(monthlySettings.paydayWeekday).toBeNull();

    const legacyNonePayload = JSON.stringify({
      app: 'tanggal-tua',
      schemaVersion: 1,
      exportedAt: '2026-11-18T10:00:00.000Z',
      settings: {
        id: 'main',
        schemaVersion: 1,
        hasOnboarded: true,
        openingBalance: 500_000,
        openingDate: '2026-11-18',
        nextPayday: '2026-12-01',
        paydayDay: null,
        tanggalTuaThreshold: 30_000,
        theme: 'system',
        lastExportAt: null,
      },
      categories: [],
      templates: [],
      transactions: [],
    });

    await importFromJson(legacyNonePayload, 'replace');
    const noneSettings = await getSettings('2026-11-18');
    expect(noneSettings.paydayRepeat).toBe('none');
    expect(noneSettings.paydayWeekday).toBeNull();

    // Weekly round-trip export & import
    await completeOnboarding({
      openingBalance: 210_000,
      openingDate: '2026-11-21',
      nextPayday: '2026-11-28',
      paydayRepeat: 'weekly',
      paydayDay: null,
      paydayWeekday: 6,
      theme: 'light',
    });

    const weeklyJson = await exportToJson('2026-11-21T10:00:00.000Z');
    await resetAllData('2026-11-21');
    await importFromJson(weeklyJson, 'replace');
    const restoredWeekly = await getSettings('2026-11-21');
    expect(restoredWeekly.paydayRepeat).toBe('weekly');
    expect(restoredWeekly.paydayWeekday).toBe(6);
    expect(restoredWeekly.paydayDay).toBeNull();
    expect(restoredWeekly.nextPayday).toBe('2026-11-28');
  });

  it('neutralizes CSV formula injection prefixes on string cells while keeping negative numbers unquoted', async () => {
    await createTransaction({
      type: 'expense',
      amount: 12_000,
      categoryId: 'cat-makan',
      note: '=SUM(A1:A5)',
      date: '2026-11-18',
      source: 'form',
    });
    await createTransaction({
      type: 'adjustment',
      amount: -5_000,
      categoryId: null,
      note: '+koreksi manual',
      date: '2026-11-18',
      source: 'form',
    });

    const csv = await exportToCsv();
    expect(csv).toContain(",'=SUM(A1:A5)");
    expect(csv).toContain(",-5000,Koreksi saldo,'+koreksi manual");
  });

  it('runs applyTemplateQuickTap/revert atomically, enforces TemplateSchema, and preserves Pemasukan fallback on updateTransaction', async () => {
    const tap = await applyTemplateQuickTap({
      templateId: 'tpl-kopi',
      date: '2026-11-18',
    });
    expect(tap.previousUsageCount).toBe(0);
    expect((await getAllTemplates()).find((t) => t.id === 'tpl-kopi')?.usageCount).toBe(1);
    expect(await getAllTransactions()).toHaveLength(1);

    await revertTemplateQuickTap({
      templateId: 'tpl-kopi',
      transactionId: tap.transaction.id,
      previousUsageCount: tap.previousUsageCount,
    });
    expect((await getAllTemplates()).find((t) => t.id === 'tpl-kopi')?.usageCount).toBe(0);
    expect(await getAllTransactions()).toHaveLength(0);

    await expect(
      createTemplate({ label: 'Gratis', amount: 0, categoryId: 'cat-jajan' })
    ).rejects.toThrow();

    const incomeTx = await createTransaction({
      type: 'income',
      amount: 100_000,
      categoryId: 'cat-gaji-freelance',
      note: 'Honor awal',
      date: '2026-11-18',
      source: 'form',
    });
    const updatedIncome = await updateTransaction(incomeTx.id, { note: '   ' });
    expect(updatedIncome?.note).toBe('Pemasukan');
  });

  it('round-trips v2 JSON with goals, dayMarks, and budgets across replace and merge modes', async () => {
    await db.goals.put({
      id: 'goal-laptop',
      name: 'Beli SSD',
      targetAmount: 600_000,
      startDate: '2026-11-18',
      deadline: '2026-12-30',
      status: 'active',
      lastMilestone: 25,
      createdAt: '2026-11-18T08:00:00.000Z',
    });
    await db.dayMarks.put({
      date: '2026-11-17',
      kind: 'no_spend',
      createdAt: '2026-11-17T21:00:00.000Z',
    });
    await db.budgets.put({
      categoryId: 'cat-jajan',
      period: 'month',
      amount: 300_000,
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-18T08:00:00.000Z',
    });
    await createTransaction({
      type: 'expense',
      amount: 150_000,
      categoryId: SYSTEM_CATEGORY_SAVING_ID,
      goalId: 'goal-laptop',
      note: 'Sisihkan Beli SSD',
      date: '2026-11-18',
      source: 'form',
    });

    const exported = await exportToJson('2026-11-18T12:00:00.000Z');
    await resetAllData('2026-11-18');
    expect(await getAllGoals()).toHaveLength(0);
    expect(await getAllDayMarks()).toHaveLength(0);
    expect(await getAllBudgets()).toHaveLength(0);

    await importFromJson(exported, 'replace');
    expect(await getAllGoals()).toHaveLength(1);
    expect(await getAllDayMarks()).toHaveLength(1);
    expect(await getAllBudgets()).toHaveLength(1);
    const txs = await getAllTransactions();
    expect(txs[0].goalId).toBe('goal-laptop');

    // Merge mode keeps existing v2 records without duplicating
    const mergeRes = await importFromJson(exported, 'merge');
    expect(mergeRes.importedTransactions).toBe(0);
    expect(await getAllGoals()).toHaveLength(1);
    expect(await getAllBudgets()).toHaveLength(1);
  });
});
