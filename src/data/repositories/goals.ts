import {
  MAX_ACTIVE_GOALS,
  computeHighestMilestoneReached,
  detectGoalMilestone,
  validateGoalInput,
} from '../../domain/goals';
import {
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
} from '../../domain/parser/keywords';
import {
  canDeleteGoalTransaction,
  computeGoalSaved,
  validateGoalDeposit,
  validateGoalWithdraw,
} from '../../domain/savings';
import type { Goal, GoalMilestone, Transaction } from '../../domain/types';
import { db } from '../db';
import { GoalSchema, TransactionSchema } from '../schemas';

export async function getAllGoals(): Promise<Goal[]> {
  return db.goals.toArray();
}

export async function createGoal(input: {
  name: string;
  targetAmount: number;
  today: string;
  deadline: string;
}): Promise<Goal> {
  const check = validateGoalInput({
    name: input.name,
    targetAmount: input.targetAmount,
    deadline: input.deadline,
    today: input.today,
  });
  if (!check.ok) {
    throw new Error(check.error);
  }

  return db.transaction('rw', db.goals, async () => {
    const existingActive = await db.goals
      .where('status')
      .equals('active')
      .count();
    if (existingActive >= MAX_ACTIVE_GOALS) {
      throw new Error(
        'Maksimal 3 target aktif. Selesaikan atau arsipkan salah satu dulu.'
      );
    }

    const goal: Goal = {
      id: crypto.randomUUID(),
      name: check.name,
      targetAmount: check.targetAmount,
      startDate: input.today,
      deadline: check.deadline,
      status: 'active',
      lastMilestone: 0,
      createdAt: new Date().toISOString(),
    };
    GoalSchema.parse(goal);
    await db.goals.put(goal);
    return goal;
  });
}

export async function updateGoal(input: {
  goalId: string;
  name: string;
  targetAmount: number;
  deadline: string;
  today: string;
}): Promise<Goal> {
  const check = validateGoalInput({
    name: input.name,
    targetAmount: input.targetAmount,
    deadline: input.deadline,
    today: input.today,
  });
  if (!check.ok) {
    throw new Error(check.error);
  }

  return db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(input.goalId);
    if (!goal) {
      throw new Error('Target tabungan tidak ditemukan.');
    }
    if (goal.status !== 'active') {
      throw new Error('Hanya target aktif yang bisa diubah.');
    }

    const existingGoalTxs = await db.transactions
      .where('goalId')
      .equals(input.goalId)
      .toArray();
    const saved = computeGoalSaved(existingGoalTxs, input.goalId);
    const lastMilestone = computeHighestMilestoneReached(
      saved,
      check.targetAmount
    );

    const updatedGoal: Goal = {
      ...goal,
      name: check.name,
      targetAmount: check.targetAmount,
      deadline: check.deadline,
      lastMilestone,
    };
    GoalSchema.parse(updatedGoal);
    await db.goals.put(updatedGoal);
    return updatedGoal;
  });
}

function buildGoalTransaction(params: {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  goalId: string;
  note: string;
  date: string;
}): Transaction {
  const nowIso = new Date().toISOString();
  const tx: Transaction = {
    id: crypto.randomUUID(),
    type: params.type,
    amount: Math.trunc(params.amount),
    categoryId: params.categoryId,
    goalId: params.goalId,
    note: params.note.trim().slice(0, 80),
    date: params.date,
    occurredAt: nowIso,
    source: 'form',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  TransactionSchema.parse(tx);
  return tx;
}

export async function depositToGoal(params: {
  goalId: string;
  amount: number;
  date: string;
  currentBalance: number;
}): Promise<{
  transaction: Transaction;
  milestoneReached: Exclude<GoalMilestone, 0> | null;
  goal: Goal;
}> {
  const check = validateGoalDeposit(params.amount, params.currentBalance);
  if (!check.ok) {
    throw new Error(check.error);
  }

  return db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(params.goalId);
    if (!goal || goal.status !== 'active') {
      throw new Error('Target tabungan tidak ditemukan atau sudah tidak aktif.');
    }

    const existingGoalTxs = await db.transactions
      .where('goalId')
      .equals(params.goalId)
      .toArray();
    const savedBefore = computeGoalSaved(existingGoalTxs, params.goalId);

    const transaction = buildGoalTransaction({
      type: 'expense',
      amount: params.amount,
      categoryId: SYSTEM_CATEGORY_SAVING_ID,
      goalId: goal.id,
      note: `Sisihkan · ${goal.name}`,
      date: params.date,
    });
    await db.transactions.put(transaction);

    const savedAfter = savedBefore + transaction.amount;
    const milestoneReached = detectGoalMilestone(
      savedAfter,
      goal.targetAmount,
      goal.lastMilestone
    );

    const updatedGoal: Goal = milestoneReached
      ? { ...goal, lastMilestone: milestoneReached }
      : goal;
    if (milestoneReached) {
      await db.goals.update(goal.id, { lastMilestone: milestoneReached });
    }

    return { transaction, milestoneReached, goal: updatedGoal };
  });
}

export async function withdrawFromGoal(params: {
  goalId: string;
  amount: number;
  date: string;
}): Promise<Transaction> {
  return db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(params.goalId);
    if (!goal || goal.status !== 'active') {
      throw new Error('Target tabungan tidak ditemukan atau sudah tidak aktif.');
    }

    const existingGoalTxs = await db.transactions
      .where('goalId')
      .equals(params.goalId)
      .toArray();
    const saved = computeGoalSaved(existingGoalTxs, params.goalId);

    const check = validateGoalWithdraw(params.amount, saved);
    if (!check.ok) {
      throw new Error(check.error);
    }

    const transaction = buildGoalTransaction({
      type: 'income',
      amount: params.amount,
      categoryId: SYSTEM_CATEGORY_WITHDRAW_ID,
      goalId: goal.id,
      note: `Tarik · ${goal.name}`,
      date: params.date,
    });
    await db.transactions.put(transaction);
    return transaction;
  });
}

export interface DeletedGoalSnapshot {
  goal: Goal;
  transactions: Transaction[];
}

export async function deleteGoalTransaction(
  goalId: string,
  txId: string
): Promise<void> {
  await db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(goalId);
    if (!goal || goal.status !== 'active') {
      throw new Error('Riwayat target yang sudah selesai atau diarsipkan tidak bisa diubah.');
    }
    const goalTxs = await db.transactions
      .where('goalId')
      .equals(goalId)
      .toArray();
    if (!canDeleteGoalTransaction(goalTxs, goalId, txId)) {
      throw new Error(
        'Entri setoran ini tidak bisa dihapus karena sisanya sudah ditarik.'
      );
    }
    await db.transactions.delete(txId);
  });
}

export async function completeGoalWithPurchase(goalId: string): Promise<void> {
  await db.goals.update(goalId, { status: 'completed' });
}

export async function hideCompletedGoal(goalId: string): Promise<void> {
  await db.transaction('rw', db.goals, async () => {
    const goal = await db.goals.get(goalId);
    if (!goal) {
      throw new Error('Target tabungan tidak ditemukan.');
    }
    if (goal.status !== 'completed') {
      throw new Error('Hanya target yang sudah selesai dibeli yang bisa disembunyikan.');
    }
    await db.goals.update(goalId, { status: 'archived' });
  });
}

export async function archiveGoal(
  goalId: string,
  todayDate: string
): Promise<{ refundedAmount: number }> {
  return db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(goalId);
    if (!goal) {
      throw new Error('Target tabungan tidak ditemukan.');
    }

    if (goal.status === 'completed') {
      await db.goals.update(goalId, { status: 'archived' });
      return { refundedAmount: 0 };
    }

    const existingGoalTxs = await db.transactions
      .where('goalId')
      .equals(goalId)
      .toArray();
    const saved = computeGoalSaved(existingGoalTxs, goalId);

    if (saved > 0) {
      const refundTx = buildGoalTransaction({
        type: 'income',
        amount: saved,
        categoryId: SYSTEM_CATEGORY_WITHDRAW_ID,
        goalId: goal.id,
        note: `Kembali dari arsip · ${goal.name}`,
        date: todayDate,
      });
      await db.transactions.put(refundTx);
    }

    await db.goals.update(goalId, { status: 'archived' });
    return { refundedAmount: Math.max(0, saved) };
  });
}

export async function deleteGoalPermanently(
  goalId: string
): Promise<DeletedGoalSnapshot> {
  return db.transaction('rw', [db.goals, db.transactions], async () => {
    const goal = await db.goals.get(goalId);
    if (!goal) {
      throw new Error('Target tabungan tidak ditemukan.');
    }
    if (goal.status === 'completed') {
      throw new Error(
        'Target yang sudah terpakai tidak bisa dihapus permanen karena uangnya sudah terpakai.'
      );
    }

    const transactions = await db.transactions
      .where('goalId')
      .equals(goalId)
      .toArray();
    await db.transactions.where('goalId').equals(goalId).delete();
    await db.goals.delete(goalId);

    return { goal, transactions };
  });
}

export async function restoreDeletedGoalSnapshot(
  snapshot: DeletedGoalSnapshot
): Promise<void> {
  await db.transaction('rw', [db.goals, db.transactions], async () => {
    GoalSchema.parse(snapshot.goal);
    await db.goals.put(snapshot.goal);
    if (snapshot.transactions.length > 0) {
      for (const tx of snapshot.transactions) {
        TransactionSchema.parse(tx);
      }
      await db.transactions.bulkPut(snapshot.transactions);
    }
  });
}
