export const APP_NAME = 'Tanggal Tua';

export function App() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] px-5 py-4">
      <header className="flex h-16 items-center justify-between">
        <h1 className="text-[18px] font-extrabold tracking-[-0.3px]">{APP_NAME}</h1>
      </header>
      <p className="text-sm text-[var(--muted)]">Bertahan sampai kiriman berikutnya.</p>
    </main>
  );
}
