import {
  markNoSpendDay,
  removeDayMark,
} from '../../data/repositories/dayMarks';
import { updateSettings } from '../../data/repositories/settings';
import {
  computeStreak,
  getFirstLogTodayCopy,
  getMilestoneCelebrationCopy,
  resolveStreakMilestone,
} from '../../domain/streak';
import type { DayMark, Transaction } from '../../domain/types';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { requestPersistentStorage } from '../../lib/pwa';

export async function runNewTransactionEffects(params: {
  createdTx: Transaction;
  transactionsBefore: Transaction[];
  dayMarks: DayMark[];
  lastCelebratedStreak: number;
  today: string;
  baseMessage: string;
  undoTx: () => Promise<void>;
}): Promise<void> {
  const {
    createdTx,
    transactionsBefore,
    dayMarks,
    lastCelebratedStreak,
    today,
    baseMessage,
    undoTx,
  } = params;

  const { showToast, triggerMascotReaction, setMascotCelebration } =
    useUIStore.getState();

  const prevStreak = computeStreak({
    transactions: transactionsBefore,
    dayMarks,
    today,
  });
  const nextStreak = computeStreak({
    transactions: [createdTx, ...transactionsBefore],
    dayMarks,
    today,
  });

  const { milestoneReached, nextLastCelebratedStreak } = resolveStreakMilestone({
    prevStreak: prevStreak.currentStreak,
    nextStreak: nextStreak.currentStreak,
    lastCelebratedStreak,
  });

  const parts = [baseMessage];

  if (milestoneReached) {
    const copy = getMilestoneCelebrationCopy(milestoneReached);
    await updateSettings({ lastCelebratedStreak: nextLastCelebratedStreak });
    setMascotCelebration({ mood: 'cheer', message: copy.heroMessage });
    parts.push(copy.toastMessage);
  } else if (!prevStreak.isLoggedToday && nextStreak.isLoggedToday) {
    parts.push(getFirstLogTodayCopy(today, nextStreak.currentStreak));
  }

  triggerHaptic(10);
  triggerMascotReaction();
  void requestPersistentStorage();

  showToast({
    message: parts.join(' · '),
    onUndo: async () => {
      await undoTx();
      if (milestoneReached) {
        await updateSettings({ lastCelebratedStreak });
        setMascotCelebration(null);
      }
    },
  });
}

export async function markNoSpendTodayWithEffects(params: {
  transactions: Transaction[];
  dayMarks: DayMark[];
  lastCelebratedStreak: number;
  today: string;
}): Promise<void> {
  const { transactions, dayMarks, lastCelebratedStreak, today } = params;
  const { showToast, triggerMascotReaction, setMascotCelebration } =
    useUIStore.getState();

  const prevStreak = computeStreak({ transactions, dayMarks, today });
  if (prevStreak.isLoggedToday) return;

  const entry = await markNoSpendDay(today);
  const nextStreak = computeStreak({
    transactions,
    dayMarks: [...dayMarks, entry],
    today,
  });

  const { milestoneReached, nextLastCelebratedStreak } = resolveStreakMilestone({
    prevStreak: prevStreak.currentStreak,
    nextStreak: nextStreak.currentStreak,
    lastCelebratedStreak,
  });

  const parts = ['Tersimpan · Hari ini tanpa pengeluaran'];
  if (milestoneReached) {
    const copy = getMilestoneCelebrationCopy(milestoneReached);
    await updateSettings({ lastCelebratedStreak: nextLastCelebratedStreak });
    setMascotCelebration({ mood: 'cheer', message: copy.heroMessage });
    parts.push(copy.toastMessage);
  } else {
    parts.push(getFirstLogTodayCopy(today, nextStreak.currentStreak));
  }

  triggerHaptic(10);
  triggerMascotReaction();

  showToast({
    message: parts.join(' · '),
    onUndo: async () => {
      await removeDayMark(today);
      if (milestoneReached) {
        await updateSettings({ lastCelebratedStreak });
        setMascotCelebration(null);
      }
    },
  });
}
