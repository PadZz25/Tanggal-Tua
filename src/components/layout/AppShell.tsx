import type { ReactNode } from 'react';
import { Mascot } from '../brand/Mascot';
import { PwaUpdateBanner } from '../ui/PwaUpdateBanner';
import { Toast } from '../ui/Toast';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  isLoading: boolean;
  error: string | null;
  showNav?: boolean;
  children: ReactNode;
}

export function AppShell({
  isLoading,
  error,
  showNav = true,
  children,
}: AppShellProps) {
  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <Mascot mood="oops" size={56} />
        <h1 className="text-[18px] font-extrabold">Penyimpanan Lokal Tidak Tersedia</h1>
        <p className="text-[14px] text-[var(--muted)]">{error}</p>
        <p className="text-[13px] text-[var(--muted)]">
          Pastikan browser tidak memblokir penyimpanan situs (IndexedDB), lalu muat ulang halaman.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[44px] rounded-[22px] bg-[var(--primary)] px-5 text-[14px] font-bold text-[var(--on-primary)]"
        >
          Muat ulang halaman
        </button>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main
        aria-busy="true"
        aria-live="polite"
        className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 px-5"
      >
        <Mascot mood="smile" size={48} />
        <p className="text-[14px] font-semibold text-[var(--muted)]">
          Memuat catatan jatah harianmu...
        </p>
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-[var(--bg)] text-[var(--ink)]">
      <PwaUpdateBanner />
      <div className="flex flex-1 flex-col px-5 pb-[148px]">{children}</div>
      <Toast />
      {showNav && <BottomNav />}
    </div>
  );
}
