import type { DayMark } from '../../domain/types';
import { db } from '../db';

export async function getAllDayMarks(): Promise<DayMark[]> {
  return db.dayMarks.toArray();
}
