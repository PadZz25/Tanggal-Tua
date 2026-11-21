import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
} from '../domain/parser/keywords';
import { TanggalTuaDB, exportLegacyDatabaseBackup } from './db';
import { ExportPayloadSchema } from './schemas';

describe('Dexie v1 to v2 migration & failure safety (1.0.0 Tugas 1)', () => {
  it('preserves v1 data completely when upgrade fails and allows exporting legacy backup', async () => {
    const dbName = `migration-fail-${crypto.randomUUID()}`;

    // Create and populate a real v1 database
    const legacyDb = new Dexie(dbName);
    legacyDb.version(1).stores({
      transactions: 'id, date, type, categoryId, createdAt',
      categories: 'id, kind, order',
      templates: 'id, order',
      settings: 'id',
      people: 'id, createdAt',
      debts: 'id, personId, direction, createdAt',
    });
    await legacyDb.open();
    await legacyDb.table('settings').put({
      id: 'main',
      schemaVersion: 1,
      hasOnboarded: true,
      openingBalance: 750_000,
      openingDate: '2026-11-01',
      nextPayday: '2026-12-01',
      paydayDay: 1,
      tanggalTuaThreshold: 30_000,
      theme: 'light',
      lastExportAt: null,
    });
    await legacyDb.table('categories').put({
      id: 'cat-makan',
      kind: 'expense',
      name: 'Makan',
      icon: 'Utensils',
      tone: 'makan',
      keywords: ['makan'],
      order: 1,
      isDefault: true,
    });
    await legacyDb.table('transactions').put({
      id: 'tx-v1-1',
      type: 'expense',
      amount: 15_000,
      categoryId: 'cat-makan',
      note: 'Nasi uduk',
      date: '2026-11-18',
      occurredAt: '2026-11-18T08:00:00.000Z',
      source: 'quick',
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-18T08:00:00.000Z',
    });
    legacyDb.close();

    // Attempt upgrade to v2 that fails inside the upgrade transaction
    const failingDb = new TanggalTuaDB(dbName, { simulateUpgradeFail: true });
    await expect(failingDb.open()).rejects.toThrow(/Simulasi kegagalan migrasi/i);
    failingDb.close();

    // Old v1 DB can still be opened and exported completely intact
    const backupJson = await exportLegacyDatabaseBackup(dbName);
    expect(backupJson).not.toBeNull();
    const parsed = JSON.parse(backupJson!);
    expect(ExportPayloadSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.settings.openingBalance).toBe(750_000);
    expect(parsed.transactions).toHaveLength(1);
    expect(parsed.transactions[0].note).toBe('Nasi uduk');

    // Now open normally with v2 -> upgrades cleanly without losing data
    const upgradedDb = new TanggalTuaDB(dbName);
    await upgradedDb.open();
    expect(upgradedDb.verno).toBe(2);

    const txs = await upgradedDb.transactions.toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0].note).toBe('Nasi uduk');
    expect(txs[0].goalId).toBeNull();

    const makan = await upgradedDb.categories.get('cat-makan');
    expect(makan?.isSystem).toBe(false);

    const sysSaving = await upgradedDb.categories.get(SYSTEM_CATEGORY_SAVING_ID);
    const sysWithdraw = await upgradedDb.categories.get(SYSTEM_CATEGORY_WITHDRAW_ID);
    expect(sysSaving?.isSystem).toBe(true);
    expect(sysSaving?.name).toBe('Tabungan');
    expect(sysWithdraw?.isSystem).toBe(true);
    expect(sysWithdraw?.name).toBe('Tarik tabungan');

    const mainSettings = await upgradedDb.settings.get('main');
    expect(mainSettings?.schemaVersion).toBe(2);

    // New v2 stores work cleanly
    await upgradedDb.dayMarks.put({
      date: '2026-11-18',
      kind: 'no_spend',
      createdAt: '2026-11-18T20:00:00.000Z',
    });
    expect(await upgradedDb.dayMarks.count()).toBe(1);

    upgradedDb.close();
    await Dexie.delete(dbName);
  });
});
