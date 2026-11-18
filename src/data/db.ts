import Dexie, { type EntityTable } from 'dexie';
import type { Category, Debt, Person, Settings, Template, Transaction } from '../domain/types';

export const CURRENT_SCHEMA_VERSION = 1;

declare global {
  interface Window {
    __TANGGAL_TUA_SIMULATE_DB_BLOCKED__?: boolean;
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

  constructor(name = 'tanggal-tua-db') {
    super(name);

    this.version(1).stores({
      transactions: 'id, date, type, categoryId, createdAt',
      categories: 'id, kind, order',
      templates: 'id, order',
      settings: 'id',
      people: 'id, createdAt',
      debts: 'id, personId, direction, createdAt',
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

export async function openDatabaseSafely(): Promise<void> {
  if (typeof window !== 'undefined' && window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__) {
    throw new Error(
      'Database lokal sedang terblokir oleh koneksi lama. Tutup tab lain atau muat ulang.'
    );
  }

  if (!db.isOpen()) {
    await db.open();
  }
}
