interface IosInstallGuideProps {
  compact?: boolean;
}

function IosShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block align-text-bottom text-[var(--primary)]"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function IosAddHomeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block align-text-bottom text-[var(--primary)]"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function IosInstallGuide({ compact = false }: IosInstallGuideProps) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p className="text-[12px] font-medium text-[var(--muted)]">
        Pasang di iPhone supaya datamu lebih awet dan app terasa seperti aplikasi.
      </p>
      <ol className="space-y-1 text-[13px] font-bold text-[var(--ink)]">
        <li className="flex items-center gap-2">
          <IosShareIcon />
          <span>1. Ketuk ikon Bagikan di bilah Safari</span>
        </li>
        <li className="flex items-center gap-2">
          <IosAddHomeIcon />
          <span>2. Pilih Tambah ke Layar Utama</span>
        </li>
      </ol>
    </div>
  );
}
