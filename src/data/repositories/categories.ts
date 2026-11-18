import type { Category, CategoryKind } from '../../domain/types';
import { db } from '../db';

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray();
}

export async function getCategoriesByKind(kind: CategoryKind): Promise<Category[]> {
  const all = await getAllCategories();
  return all.filter((c) => c.kind === kind);
}
