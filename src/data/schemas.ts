import { z } from 'zod';
import { MAX_AMOUNT, MIN_AMOUNT } from '../domain/money';

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const TransactionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['expense', 'income', 'adjustment']),
    amount: z.number().int(),
    categoryId: z.string().min(1).nullable(),
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

export const CategorySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['expense', 'income']),
  name: z.string().min(1).max(40),
  icon: z.string().min(1),
  tone: z.string().min(1),
  keywords: z.array(z.string()),
  order: z.number().int(),
  isDefault: z.boolean(),
});

export const TemplateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(40),
  amount: z.number().int().min(MIN_AMOUNT).max(MAX_AMOUNT),
  categoryId: z.string().min(1),
  order: z.number().int(),
  usageCount: z.number().int().min(0),
});

export const SettingsSchema = z.object({
  id: z.literal('main'),
  schemaVersion: z.number().int().min(1),
  hasOnboarded: z.boolean(),
  openingBalance: z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT),
  openingDate: z.string().regex(dateStringRegex),
  nextPayday: z.string().regex(dateStringRegex),
  paydayDay: z.number().int().min(1).max(31).nullable(),
  tanggalTuaThreshold: z.number().int().min(1_000).max(MAX_AMOUNT),
  theme: z.enum(['system', 'light', 'dark']),
  lastExportAt: z.string().nullable(),
});

export const ExportPayloadSchema = z.object({
  app: z.literal('tanggal-tua'),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string().min(1),
  settings: SettingsSchema,
  categories: z.array(CategorySchema),
  templates: z.array(TemplateSchema),
  transactions: z.array(TransactionSchema),
});

export type ExportPayload = z.infer<typeof ExportPayloadSchema>;
