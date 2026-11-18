import Dexie, { type EntityTable } from 'dexie';
import type { Category, Debt, Person, Settings, Template, Transaction } from '../domain/types';

export const CURRENT_SCHEMA_VERSION = 1;

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
  }
}

export const db = new TanggalTuaDB();
