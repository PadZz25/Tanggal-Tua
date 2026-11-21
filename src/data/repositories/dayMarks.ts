import type { DayMark } from '../../domain/types';
import { db } from '../db';
import { DayMarkSchema } from '../schemas';

export async function getAllDayMarks(): Promise<DayMark[]> {
  return db.dayMarks.toArray();
}

export async function markNoSpendDay(date: string): Promise<DayMark> {
  const entry: DayMark = {
    date,
    kind: 'no_spend',
    createdAt: new Date().toISOString(),
  };
  DayMarkSchema.parse(entry);
  await db.dayMarks.put(entry);
  return entry;
}

export async function removeDayMark(date: string): Promise<void> {
  await db.dayMarks.delete(date);
}
