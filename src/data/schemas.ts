import { z } from 'zod';
import { MAX_AMOUNT, MIN_AMOUNT } from '../domain/money';
import {
  SYSTEM_CATEGORY_SAVING_ID,
  SYSTEM_CATEGORY_WITHDRAW_ID,
} from '../domain/parser/keywords';

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeStringRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const TransactionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['expense', 'income', 'adjustment']),
    amount: z.number().int(),
    categoryId: z.string().min(1).nullable(),
    goalId: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .transform((val) => val ?? null),
    note: z.string().max(80),
    date: z.string().regex(dateStringRegex, 'Format tanggal harus YYYY-MM-DD'),
    occurredAt: z.string().min(1),
    source: z.enum(['quick', 'form', 'template', 'voice']),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .superRefine((tx, ctx) => {
    if (tx.type === 'adjustment') {
      if (tx.amount === 0 || Math.abs(tx.amount) > MAX_AMOUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nominal koreksi saldo tidak boleh nol atau melebihi batas.',
          path: ['amount'],
        });
      }
    } else {
      if (tx.amount < MIN_AMOUNT || tx.amount > MAX_AMOUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nominal transaksi berada di luar batas wajar.',
          path: ['amount'],
        });
      }
    }
  });

export const CategorySchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['expense', 'income']),
    name: z.string().min(1).max(40),
    icon: z.string().min(1),
    tone: z.string().min(1),
    keywords: z.array(z.string()),
    order: z.number().int(),
    isDefault: z.boolean(),
    isSystem: z.boolean().optional(),
  })
  .transform((row) => ({
    ...row,
    isSystem:
      typeof row.isSystem === 'boolean'
        ? row.isSystem
        : row.id === SYSTEM_CATEGORY_SAVING_ID || row.id === SYSTEM_CATEGORY_WITHDRAW_ID,
  }));

export const TemplateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(40),
  amount: z.number().int().min(MIN_AMOUNT).max(MAX_AMOUNT),
  categoryId: z.string().min(1),
  order: z.number().int(),
  usageCount: z.number().int().min(0),
});

export const GoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  targetAmount: z.number().int().min(10_000).max(MAX_AMOUNT),
  startDate: z.string().regex(dateStringRegex),
  deadline: z.string().regex(dateStringRegex),
  status: z.enum(['active', 'completed', 'archived']),
  lastMilestone: z.union([
    z.literal(0),
    z.literal(25),
    z.literal(50),
    z.literal(75),
    z.literal(100),
  ]),
  createdAt: z.string().min(1),
});

export const DayMarkSchema = z.object({
  date: z.string().regex(dateStringRegex),
  kind: z.literal('no_spend'),
  createdAt: z.string().min(1),
});

export const BudgetSchema = z.object({
  categoryId: z
    .string()
    .min(1)
    .refine(
      (id) => id !== SYSTEM_CATEGORY_SAVING_ID && id !== SYSTEM_CATEGORY_WITHDRAW_ID,
      'Anggaran tidak berlaku untuk kategori sistem.'
    ),
  period: z.enum(['week', 'month']),
  amount: z.number().int().min(1_000).max(MAX_AMOUNT),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const PaydayWeekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const SettingsSchema = z
  .object({
    id: z.literal('main'),
    schemaVersion: z.number().int().min(1),
    hasOnboarded: z.boolean(),
    openingBalance: z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT),
    openingDate: z.string().regex(dateStringRegex),
    nextPayday: z.string().regex(dateStringRegex),
    paydayRepeat: z.enum(['none', 'monthly', 'weekly']).optional(),
    paydayDay: z.number().int().min(1).max(31).nullable(),
    paydayWeekday: PaydayWeekdaySchema.nullable().optional(),
    tanggalTuaThreshold: z.number().int().min(1_000).max(MAX_AMOUNT),
    theme: z.enum(['system', 'light', 'dark']),
    lastExportAt: z.string().nullable(),
    reminderEnabled: z.boolean().optional(),
    reminderTime: z.string().regex(timeStringRegex).optional(),
    lastCelebratedStreak: z.number().int().min(0).optional(),
    backupSnoozeUntil: z.string().regex(dateStringRegex).nullable().optional(),
    iosHintDismissed: z.boolean().optional(),
  })
  .transform((row) => ({
    ...row,
    paydayRepeat:
      row.paydayRepeat ?? (row.paydayDay !== null ? ('monthly' as const) : ('none' as const)),
    paydayWeekday: row.paydayWeekday ?? null,
    reminderEnabled: row.reminderEnabled ?? false,
    reminderTime: row.reminderTime ?? '20:00',
    lastCelebratedStreak: row.lastCelebratedStreak ?? 0,
    backupSnoozeUntil: row.backupSnoozeUntil ?? null,
    iosHintDismissed: row.iosHintDismissed ?? false,
  }));

export const ExportPayloadSchema = z.object({
  app: z.literal('tanggal-tua'),
  schemaVersion: z.number().int().min(1).max(2),
  exportedAt: z.string().min(1),
  settings: SettingsSchema,
  categories: z.array(CategorySchema),
  templates: z.array(TemplateSchema),
  transactions: z.array(TransactionSchema),
  goals: z.array(GoalSchema).optional().default([]),
  dayMarks: z.array(DayMarkSchema).optional().default([]),
  budgets: z.array(BudgetSchema).optional().default([]),
});

export type ExportPayload = z.infer<typeof ExportPayloadSchema>;
