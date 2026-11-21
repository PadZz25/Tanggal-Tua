import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { exportLegacyDatabaseBackup } from '../../data/db';
import { today } from '../../domain/dates';
import { downloadBlob } from '../../lib/download';
import { resetApplicationCache } from '../../lib/pwa';
import { Mascot } from '../brand/Mascot';

interface RecoveryScreenProps {
  message: string;
}

export function LoadFailureScreen({ message }: RecoveryScreenProps) {
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadLegacyBackup = async () => {
    setIsExporting(true);
    setBackupFeedback(null);
    try {
      const json = await exportLegacyDatabaseBackup();
      if (!json) {
        setBackupFeedback('Belum ditemukan data lama untuk diunduh.');
        return;
      }
      downloadBlob(
        json,
        `tanggal-tua-backup-lama-${today()}.json`,
        'application/json;charset=utf-8'
      );
      setBackupFeedback('Cadangan data lama berhasil diunduh.');
    } catch {
      setBackupFeedback(
        'Database lama sedang terkunci oleh tab lain. Tutup tab lain lalu coba lagi.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetCache = async () => {
    await resetApplicationCache();
    window.location.reload();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 bg-[var(--bg)] px-5 text-center text-[var(--ink)]">
      <Mascot mood="oops" size={56} />
      <h1 className="text-[20px] font-extrabold tracking-[-0.3px]">Gagal memuat</h1>
      <p className="text-[14px] font-medium text-[var(--muted)]">{message}</p>
      <p className="text-[12px] text-[var(--muted)]">
        Data catatanmu di penyimpanan lokal tetap aman dan tidak akan dihapus.
      </p>
      <div className="mt-2 flex w-full max-w-[320px] flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void handleDownloadLegacyBackup()}
          disabled={isExporting}
          className="min-h-[48px] w-full rounded-[22px] border border-[var(--primary)] bg-[var(--primary-tint)] px-5 text-[14px] font-extrabold text-[var(--primary)] hover:opacity-90"
        >
          {isExporting ? 'Menyiapkan cadangan...' : 'Unduh cadangan data lama'}
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--on-primary)',
          }}
          className="min-h-[48px] w-full rounded-[22px] px-5 text-[14px] font-extrabold"
        >
          Muat ulang
        </button>
        <button
          type="button"
          onClick={() => void handleResetCache()}
          className="min-h-[48px] w-full rounded-[22px] border border-[var(--border-control)] bg-[var(--surface)] px-5 text-[14px] font-extrabold text-[var(--ink)] hover:bg-[var(--border-soft)]"
        >
          Reset cache aplikasi
        </button>
      </div>
      {backupFeedback && (
        <p role="status" className="text-[13px] font-semibold text-[var(--ink)]">
          {backupFeedback}
        </p>
      )}
    </main>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  errorMessage: string | null;
}

export class AppErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Terjadi kendala saat menyiapkan tampilan aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.errorMessage) {
      return <LoadFailureScreen message={this.state.errorMessage} />;
    }
    return this.props.children;
  }
}
