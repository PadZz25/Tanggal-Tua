import { useEffect, useState } from 'react';
import { UI_STRINGS } from '../../domain/copy';

export function PwaUpdateBanner() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !import.meta.env.PROD
    ) {
      return;
    }

    let isMounted = true;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (!isMounted) return;

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              isMounted
            ) {
              setWaitingWorker(newWorker);
            }
          });
        });
      })
      .catch(() => {
        // Ignore service worker registration errors in unsupported environments
      });

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  const handleReload = () => {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

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
            onClick={handleReload}
            className="min-h-[38px] rounded-[14px] bg-[var(--coin)] px-3 text-[13px] font-extrabold text-[var(--coin-ink)]"
          >
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
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
