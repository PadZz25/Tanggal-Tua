import type { Budget } from '../../domain/types';
import { db } from '../db';

export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.toArray();
}
