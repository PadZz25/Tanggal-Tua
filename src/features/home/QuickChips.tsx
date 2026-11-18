import { Plus } from 'lucide-react';
import {
  applyTemplateQuickTap,
  revertTemplateQuickTap,
} from '../../data/repositories/templates';
import { UI_STRINGS } from '../../domain/copy';
import { formatShort } from '../../domain/money';
import type { Template } from '../../domain/types';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { requestPersistentStorage } from '../../lib/pwa';

interface QuickChipsProps {
  templates: Template[];
  today: string;
  onAddTemplateClick: () => void;
}

export function QuickChips({
  templates,
  today,
  onAddTemplateClick,
}: QuickChipsProps) {
  const showToast = useUIStore((s) => s.showToast);
  const triggerMascotReaction = useUIStore((s) => s.triggerMascotReaction);

  const handleChipTap = async (tpl: Template) => {
    const { transaction, previousUsageCount } = await applyTemplateQuickTap({
      templateId: tpl.id,
      date: today,
    });

    triggerHaptic(10);
    triggerMascotReaction();
    void requestPersistentStorage();

    showToast({
      message: `Tersimpan · ${tpl.label} ${formatShort(-tpl.amount)}`,
      onUndo: async () => {
        await revertTemplateQuickTap({
          templateId: tpl.id,
          transactionId: transaction.id,
          previousUsageCount,
        });
      },
    });
  };

  return (
    <section aria-label={UI_STRINGS.quickSectionLabel} className="mt-4">
      <h2 className="text-[13px] font-bold text-[var(--muted)]">
        {UI_STRINGS.quickSectionLabel}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => void handleChipTap(tpl)}
            className="inline-flex h-[44px] items-center gap-1.5 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] font-bold text-[var(--ink)] transition-colors hover:border-[var(--border-control)] hover:bg-[var(--border-soft)] active:scale-95"
          >
            <span>{tpl.label}</span>
            <span className="tabular-nums text-[13px] font-semibold text-[var(--muted)]">
              {formatShort(tpl.amount)}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onAddTemplateClick}
          aria-label="Tambah template catat cepat"
          className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[22px] border border-dashed border-[var(--border-control)] bg-transparent text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
        >
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
