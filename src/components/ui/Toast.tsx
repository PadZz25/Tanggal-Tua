import { UI_STRINGS } from '../../domain/copy';
import { useUIStore } from '../../hooks/useUIStore';

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const triggerUndo = useUIStore((s) => s.triggerUndo);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ bottom: 'calc(134px + env(safe-area-inset-bottom, 0px))' }}
      className="fixed inset-x-0 z-40 mx-auto flex max-w-[440px] px-5 pointer-events-none"
    >
      <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--border-control)] bg-[var(--ink)] px-4 py-2 text-[var(--bg)] shadow-lg transition-all duration-200">
        <span className="text-[14px] font-semibold leading-snug">{toast.message}</span>
        {toast.onUndo && (
          <button
            type="button"
            onClick={() => void triggerUndo()}
            className="min-h-[44px] min-w-[44px] shrink-0 rounded-[14px] px-3 text-[14px] font-extrabold text-[var(--coin)] hover:underline active:opacity-80"
          >
            {toast.undoLabel ?? UI_STRINGS.undoButton}
          </button>
        )}
      </div>
    </div>
  );
}
