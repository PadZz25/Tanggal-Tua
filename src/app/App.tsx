import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Mascot } from '../components/brand/Mascot';
import { AppErrorBoundary } from '../components/layout/AppErrorBoundary';
import { AppShell } from '../components/layout/AppShell';
import { PwaUpdateBanner } from '../components/ui/PwaUpdateBanner';
import { UI_STRINGS } from '../domain/copy';
import { HomePage } from '../features/home/HomePage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { TransactionSheet } from '../features/transactions/TransactionSheet';
import { useHomeState } from '../hooks/useHomeState';
import { useTheme } from '../hooks/useTheme';

const HistoryPage = lazy(() => import('../features/history/HistoryPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

export const APP_NAME = UI_STRINGS.appName;

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-2 py-12"
    >
      <Mascot mood="smile" size={40} />
      <p className="text-[13px] font-semibold text-[var(--muted)]">Memuat halaman...</p>
    </div>
  );
}

export function AppRoutes() {
  const live = useHomeState();
  useTheme(live.settings.theme);

  if (live.isLoading || live.error) {
    return (
      <AppShell isLoading={live.isLoading} error={live.error} showNav={false}>
        <span />
      </AppShell>
    );
  }

  if (!live.settings.hasOnboarded) {
    return (
      <>
        <PwaUpdateBanner />
        <Routes>
          <Route
            path="/onboarding"
            element={
              <OnboardingPage
                today={live.today}
                initialTheme={live.settings.theme}
              />
            }
          />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <AppShell isLoading={false} error={null} showNav={true}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage live={live} />} />
          <Route path="/riwayat" element={<HistoryPage live={live} />} />
          <Route path="/pengaturan" element={<SettingsPage live={live} />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <TransactionSheet
        today={live.today}
        openingDate={live.settings.openingDate}
        categories={live.categories}
        transactions={live.transactions}
      />
    </AppShell>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
