import { UI_STRINGS } from '../../domain/copy';
import {
  applyWaitingServiceWorker,
  dismissWaitingServiceWorker,
  usePwaStatus,
} from '../../lib/pwa';

export function PwaUpdateBanner() {
  const { waitingWorker } = usePwaStatus();

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-3 z-50 mx-auto flex max-w-[440px] px-5"
    >
      <div className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--border-control)] bg-[var(--ink)] px-4 py-2.5 text-[var(--bg)] shadow-lg">
        <span className="text-[13px] font-bold">{UI_STRINGS.pwaUpdateAvailable}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={applyWaitingServiceWorker}
            className="min-h-[38px] rounded-[14px] bg-[var(--coin)] px-3 text-[13px] font-extrabold text-[var(--coin-ink)]"
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={dismissWaitingServiceWorker}
            aria-label="Tutup pemberitahuan versi baru"
            className="min-h-[38px] px-2 text-[12px] font-semibold underline"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
