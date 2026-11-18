import { beforeEach, describe, expect, it } from 'vitest';
import { exportToCsv, exportToJson, importFromJson, UTF8_BOM } from './exportImport';
import { completeOnboarding, getSettings, resetAllData } from './repositories/settings';
import { applyTemplateQuickTap, getAllTemplates, sortTopTemplates } from './repositories/templates';
import { createTransaction, getAllTransactions } from './repositories/transactions';
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
    expect(settings.tanggalTuaThreshold).toBe(30_000);
    expect(templates).toHaveLength(3);
    expect(templates.map((t) => t.label)).toEqual(['Kopi', 'Parkir', 'Makan']);
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
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.transactions).toHaveLength(1);

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

    const csv = await exportToCsv();
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).toContain('date,type,amount,category,note');
    expect(csv).toContain('2026-11-18,expense,18000,Jajan,"Kopi, roti"');
  });
});
