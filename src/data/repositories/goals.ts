import type { Goal } from '../../domain/types';
import { db } from '../db';

export async function getAllGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}
