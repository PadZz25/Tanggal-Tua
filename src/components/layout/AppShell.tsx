import type { ReactNode } from 'react';
import { Mascot } from '../brand/Mascot';
import { PwaUpdateBanner } from '../ui/PwaUpdateBanner';
import { Toast } from '../ui/Toast';
import { LoadFailureScreen } from './AppErrorBoundary';
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
    return <LoadFailureScreen message={error} />;
  }

  if (isLoading) {
    return (
      <main
        aria-busy="true"
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
