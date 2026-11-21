import Dexie, { type EntityTable } from 'dexie';
import { SYSTEM_CATEGORIES } from '../domain/parser/keywords';
import type {
  Budget,
  Category,
  DayMark,
  Debt,
  Goal,
  Person,
  Settings,
  Template,
  Transaction,
} from '../domain/types';

export const CURRENT_SCHEMA_VERSION = 2;

declare global {
  interface Window {
    __TANGGAL_TUA_SIMULATE_DB_BLOCKED__?: boolean;
    __TANGGAL_TUA_SIMULATE_UPGRADE_FAIL__?: boolean;
    __TANGGAL_TUA_BOOTSTRAP_TIMEOUT_MS__?: number;
  }
}

export class TanggalTuaDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  templates!: EntityTable<Template, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  people!: EntityTable<Person, 'id'>;
  debts!: EntityTable<Debt, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  dayMarks!: EntityTable<DayMark, 'date'>;
  budgets!: EntityTable<Budget, 'categoryId'>;

  constructor(
    name = 'tanggal-tua-db',
    options?: { simulateUpgradeFail?: boolean }
  ) {
    super(name);

    this.version(1).stores({
      transactions: 'id, date, type, categoryId, createdAt',
      categories: 'id, kind, order',
      templates: 'id, order',
      settings: 'id',
      people: 'id, createdAt',
      debts: 'id, personId, direction, createdAt',
    });

    this.version(2)
      .stores({
        transactions: 'id, date, type, categoryId, goalId, createdAt',
        categories: 'id, kind, order',
        templates: 'id, order',
        settings: 'id',
        people: 'id, createdAt',
        debts: 'id, personId, direction, createdAt',
        goals: 'id, status, deadline',
        dayMarks: 'date',
        budgets: 'categoryId',
      })
      .upgrade(async (tx) => {
        if (
          options?.simulateUpgradeFail ||
          (typeof window !== 'undefined' &&
            window.__TANGGAL_TUA_SIMULATE_UPGRADE_FAIL__)
        ) {
          throw new Error(
            'Simulasi kegagalan migrasi database ke versi 2. Data lamamu tetap aman.'
          );
        }

        await tx
          .table('transactions')
          .toCollection()
          .modify((item: Record<string, unknown>) => {
            if (item.goalId === undefined) {
              item.goalId = null;
            }
          });

        await tx
          .table('categories')
          .toCollection()
          .modify((cat: Record<string, unknown>) => {
            if (typeof cat.isSystem !== 'boolean') {
              cat.isSystem =
                cat.id === 'cat-tabungan' || cat.id === 'cat-tarik-tabungan';
            }
          });

        const catTable = tx.table('categories');
        for (const sysCat of SYSTEM_CATEGORIES) {
          const existing = await catTable.get(sysCat.id);
          if (!existing) {
            await catTable.put(sysCat);
          } else {
            await catTable.put({ ...sysCat, ...existing, isSystem: true });
          }
        }

        const settingsTable = tx.table('settings');
        const main = (await settingsTable.get('main')) as
          | Record<string, unknown>
          | undefined;
        if (main) {
          await settingsTable.put({
            ...main,
            schemaVersion: CURRENT_SCHEMA_VERSION,
          });
        }
      });

    this.on('versionchange', () => {
      // Close old connection immediately so schema upgrades or other tabs never hang
      this.close();
    });

    this.on('blocked', () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tanggal-tua-db-blocked', {
            detail:
              'Database lokal sedang terkunci oleh tab atau proses lain. Tutup tab lain lalu muat ulang.',
          })
        );
      }
    });
  }
}

export const db = new TanggalTuaDB();

let openPromise: Promise<void> | null = null;

export async function openDatabaseSafely(): Promise<void> {
  if (typeof window !== 'undefined' && window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__) {
    throw new Error(
      'Database lokal sedang terblokir oleh koneksi lama. Tutup tab lain atau muat ulang.'
    );
  }

  if (db.isOpen()) return;
  if (!openPromise) {
    openPromise = db
      .open()
      .then(() => undefined)
      .catch((err: unknown) => {
        db.close();
        throw err;
      })
      .finally(() => {
        openPromise = null;
      });
  }
  return openPromise;
}

export async function exportLegacyDatabaseBackup(
  dbName = db.name
): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  if (dbName === db.name) {
    db.close();
  }

  return new Promise((resolve, reject) => {
    // Open without version so IndexedDB opens the existing v1/v2 database without triggering upgrade
    const request = indexedDB.open(dbName);
    request.onerror = () => {
      reject(request.error ?? new Error('Gagal membuka penyimpanan lokal lama.'));
    };
    request.onsuccess = () => {
      const idb = request.result;
      const storeNames = Array.from(idb.objectStoreNames);
      if (storeNames.length === 0) {
        idb.close();
        resolve(null);
        return;
      }

      const idbTx = idb.transaction(storeNames, 'readonly');
      const dump: Record<string, unknown[]> = {};

      for (const name of storeNames) {
        const req = idbTx.objectStore(name).getAll();
        req.onsuccess = () => {
          dump[name] = req.result as unknown[];
        };
      }

      idbTx.oncomplete = () => {
        const version = idb.version;
        idb.close();

        const settingsRows = dump.settings ?? [];
        const rawMain = settingsRows.find(
          (row) =>
            typeof row === 'object' &&
            row !== null &&
            (row as { id?: unknown }).id === 'main'
        ) as Record<string, unknown> | undefined;

        const transactions = (dump.transactions ?? []) as Array<Record<string, unknown>>;
        const categories = (dump.categories ?? []) as Array<Record<string, unknown>>;
        const templates = (dump.templates ?? []) as Array<Record<string, unknown>>;

        if (
          !rawMain &&
          transactions.length === 0 &&
          categories.length === 0 &&
          templates.length === 0
        ) {
          resolve(null);
          return;
        }

        const resolvedSchemaVersion =
          typeof rawMain?.schemaVersion === 'number'
            ? rawMain.schemaVersion
            : storeNames.includes('goals') || version >= 20
              ? 2
              : 1;

        const backup = {
          app: 'tanggal-tua',
          schemaVersion: resolvedSchemaVersion,
          exportedAt: new Date().toISOString(),
          settings: rawMain ?? {
            id: 'main',
            schemaVersion: resolvedSchemaVersion,
            hasOnboarded: transactions.length > 0,
            openingBalance: 0,
            openingDate: '2026-11-18',
            nextPayday: '2026-12-01',
            paydayDay: 1,
            tanggalTuaThreshold: 30_000,
            theme: 'system',
            lastExportAt: null,
          },
          categories,
          templates,
          transactions,
          ...(Array.isArray(dump.goals) ? { goals: dump.goals } : {}),
          ...(Array.isArray(dump.dayMarks) ? { dayMarks: dump.dayMarks } : {}),
          ...(Array.isArray(dump.budgets) ? { budgets: dump.budgets } : {}),
        };

        resolve(JSON.stringify(backup, null, 2));
      };

      idbTx.onerror = () => {
        idb.close();
        reject(idbTx.error ?? new Error('Gagal membaca data lama.'));
      };
    };
  });
}
