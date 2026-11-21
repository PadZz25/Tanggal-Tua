import { Download, Smartphone } from 'lucide-react';
import { useState } from 'react';
import {
  isInAppWebView,
  isIosSafari,
  triggerNativePwaInstall,
  usePwaStatus,
} from '../../lib/pwa';
import { Sheet } from './Sheet';

interface InstallPwaButtonProps {
  variant?: 'compact' | 'card';
}

export function InstallPwaButton({ variant = 'compact' }: InstallPwaButtonProps) {
  const { isStandalone, canPromptInstall, swRegistered, isSecure } = usePwaStatus();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  if (isStandalone || isIosSafari()) return null;

  const inAppBrowser = isInAppWebView();

  const handleInstallClick = async () => {
    if (canPromptInstall) {
      const result = await triggerNativePwaInstall();
      if (result !== 'unavailable') {
        return;
      }
    }
    setIsGuideOpen(true);
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          aria-label="Instal aplikasi Tanggal Tua"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[22px] border border-[var(--border-control)] bg-[var(--surface)] px-3.5 text-[13px] font-extrabold text-[var(--primary)] transition-colors hover:bg-[var(--primary-tint)] active:scale-95"
        >
          <Download size={16} strokeWidth={2.4} aria-hidden="true" />
          <span>Instal</span>
        </button>
      ) : (
        <section
          aria-labelledby="settings-install-pwa-heading"
          className="rounded-[24px] border border-[var(--primary)] bg-[var(--primary-tint)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              >
                <Smartphone size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2
                  id="settings-install-pwa-heading"
                  className="text-[15px] font-extrabold text-[var(--ink)]"
                >
                  Pasang Aplikasi di HP
                </h2>
                <p className="mt-0.5 text-[12px] font-medium text-[var(--ink)] opacity-85">
                  Buka langsung dari layar utama seperti aplikasi penuh dan tetap jalan
                  walau tanpa sinyal internet.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleInstallClick()}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
            className="mt-3 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] px-4 text-[14px] font-extrabold transition-transform active:scale-98"
          >
            <Download size={17} strokeWidth={2.4} aria-hidden="true" />
            <span>Instal aplikasi sekarang</span>
          </button>
        </section>
      )}

      <Sheet
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="Instal Aplikasi Tanggal Tua"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-[var(--border-control)] bg-[var(--bg)] px-3 py-1 text-[12px] font-bold text-[var(--ink)]">
              HTTPS: {isSecure ? 'Aktif' : 'Belum HTTPS'}
            </span>
            <span className="inline-flex items-center rounded-full border border-[var(--border-control)] bg-[var(--bg)] px-3 py-1 text-[12px] font-bold text-[var(--ink)]">
              Service Worker: {swRegistered ? 'Siap Offline' : 'Memuat...'}
            </span>
          </div>

          {canPromptInstall && (
            <button
              type="button"
              onClick={async () => {
                await triggerNativePwaInstall();
                setIsGuideOpen(false);
              }}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[20px] px-4 text-[15px] font-extrabold"
            >
              <Download size={18} strokeWidth={2.4} aria-hidden="true" />
              <span>Download & Pasang Sekarang</span>
            </button>
          )}

          {inAppBrowser && (
            <div className="rounded-[18px] border border-[var(--warm-ink)] bg-[var(--bg)] p-3.5">
              <p className="text-[13px] font-extrabold text-[var(--warm-ink)]">
                Terdeteksi Browser Bawaan Aplikasi (In-App Browser)
              </p>
              <p className="mt-1 text-[13px] font-medium text-[var(--ink)]">
                Android memblokir instalasi aplikasi di dalam WebView WhatsApp, Telegram,
                atau Instagram. Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan
                atas lalu pilih <strong>Buka di Chrome</strong>.
              </p>
            </div>
          )}

          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg)] p-4">
            <h3 className="text-[14px] font-extrabold text-[var(--ink)]">
              Cara Pasang di Android 16 (Chrome):
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] font-semibold text-[var(--ink)]">
              <li>
                Pastikan halaman ini dibuka di aplikasi <strong>Google Chrome</strong>.
              </li>
              <li>
                Ketuk ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas alamat web.
              </li>
              <li>
                Pilih menu <strong>Tambahkan ke layar utama</strong> (atau{' '}
                <strong>Instal aplikasi</strong>), lalu ketuk <strong>Instal</strong>.
              </li>
            </ol>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="min-h-[44px] rounded-[18px] border border-[var(--border-control)] px-5 text-[14px] font-bold text-[var(--ink)]"
            >
              Mengerti
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
