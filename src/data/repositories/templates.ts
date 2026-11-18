import type { Template, Transaction } from '../../domain/types';
import { db } from '../db';
import { createTransaction } from './transactions';

export async function getAllTemplates(): Promise<Template[]> {
  return db.templates.orderBy('order').toArray();
}

export function sortTopTemplates(templates: readonly Template[], limit = 3): Template[] {
  return [...templates]
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.order - b.order;
    })
    .slice(0, limit);
}

export async function createTemplate(input: {
  label: string;
  amount: number;
  categoryId: string;
}): Promise<Template> {
  const all = await getAllTemplates();
  const minOrder = all.reduce((min, t) => Math.min(min, t.order), 1);
  const template: Template = {
    id: crypto.randomUUID(),
    label: input.label.trim().slice(0, 40),
    amount: Math.trunc(input.amount),
    categoryId: input.categoryId,
    order: minOrder - 1,
    usageCount: 0,
  };
  await db.templates.put(template);
  return template;
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<Template, 'label' | 'amount' | 'categoryId' | 'order'>>
): Promise<Template | null> {
  const existing = await db.templates.get(id);
  if (!existing) return null;
  const updated: Template = {
    ...existing,
    ...patch,
    label: patch.label !== undefined ? patch.label.trim().slice(0, 40) : existing.label,
  };
  await db.templates.put(updated);
  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}

export async function reorderTemplate(id: string, direction: 'up' | 'down'): Promise<void> {
  const all = await getAllTemplates();
  const index = all.findIndex((t) => t.id === id);
  if (index === -1) return;
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const neighbor = all[swapIndex];
  await db.transaction('rw', db.templates, async () => {
    await db.templates.update(current.id, { order: neighbor.order });
    await db.templates.update(neighbor.id, { order: current.order });
  });
}

export async function applyTemplateQuickTap(params: {
  templateId: string;
  date: string;
}): Promise<{ transaction: Transaction; previousUsageCount: number }> {
  const tpl = await db.templates.get(params.templateId);
  if (!tpl) {
    throw new Error('Template tidak ditemukan');
  }

  const previousUsageCount = tpl.usageCount;
  await db.templates.update(tpl.id, { usageCount: previousUsageCount + 1 });

  const transaction = await createTransaction({
    type: 'expense',
    amount: tpl.amount,
    categoryId: tpl.categoryId,
    note: tpl.label,
    date: params.date,
    source: 'template',
  });

  return { transaction, previousUsageCount };
}

export async function revertTemplateQuickTap(params: {
  templateId: string;
  transactionId: string;
  previousUsageCount: number;
}): Promise<void> {
  await db.transaction('rw', db.templates, db.transactions, async () => {
    await db.transactions.delete(params.transactionId);
    await db.templates.update(params.templateId, {
      usageCount: Math.max(0, params.previousUsageCount),
    });
  });
}
