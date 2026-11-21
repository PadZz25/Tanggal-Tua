import type { Category } from '../../domain/types';
import { db } from '../db';

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray();
}
