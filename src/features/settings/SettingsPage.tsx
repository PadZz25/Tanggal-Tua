import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { InstallPwaButton } from '../../components/ui/InstallPwaButton';
import { Sheet } from '../../components/ui/Sheet';
import {
  exportToCsv,
  exportToJson,
  importFromJson,
  type ImportMode,
} from '../../data/exportImport';
import { resetAllData, updateSettings } from '../../data/repositories/settings';
import {
  createTemplate,
  deleteTemplate,
  reorderTemplate,
  updateTemplate,
} from '../../data/repositories/templates';
import { createBalanceAdjustment } from '../../data/repositories/transactions';
import { UI_STRINGS } from '../../domain/copy';
import { addDays, daysBetween, parseDateParts } from '../../domain/dates';
import {
  formatFull,
  formatShort,
  isValidAmount,
  MAX_AMOUNT,
  parseNominalInput,
} from '../../domain/money';
import type { Template, ThemePreference } from '../../domain/types';
import type { AppLiveState } from '../../hooks/useHomeState';
import {
  applyThemeToDocument,
  normalizeThemePreference,
} from '../../hooks/useTheme';
import { useUIStore } from '../../hooks/useUIStore';

interface SettingsPageProps {
  live: AppLiveState;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function SettingsPage({ live }: SettingsPageProps) {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [nextPayday, setNextPayday] = useState(live.settings.nextPayday);
  const [repeatMonthly, setRepeatMonthly] = useState(
    live.settings.paydayDay !== null
  );

  const [targetBalanceInput, setTargetBalanceInput] = useState('');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [isTplSheetOpen, setIsTplSheetOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<Template | null>(null);
  const [tplLabel, setTplLabel] = useState('');
  const [tplAmountInput, setTplAmountInput] = useState('');
  const [tplCategoryId, setTplCategoryId] = useState('cat-jajan');
  const [tplError, setTplError] = useState<string | null>(null);

  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [resetStep, setResetStep] = useState<0 | 1>(0);

  const expenseCategories = live.categories.filter((c) => c.kind === 'expense');
  const currentTheme = normalizeThemePreference(live.settings.theme);

  const THEME_OPTIONS = [
    { id: 'system', label: 'Sistem' },
    { id: 'light', label: 'Terang' },
    { id: 'dark', label: 'Gelap' },
  ] as const;

  const handleThemeSelect = async (theme: ThemePreference) => {
    const normalized = normalizeThemePreference(theme);
    await updateSettings({ theme: normalized });
    applyThemeToDocument(normalized);
    showToast({ message: 'Tema tampilan diperbarui' });
  };

  const handleThemeKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
      void handleThemeSelect(next.id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev =
        THEME_OPTIONS[(index - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length];
      void handleThemeSelect(prev.id);
    }
  };

  const handleSavePayday = async (e: FormEvent) => {
    e.preventDefault();
    if (!nextPayday || daysBetween(live.today, nextPayday) <= 0) {
      showToast({ message: 'Pilih tanggal kiriman setelah hari ini' });
      return;
    }
    const paydayDay = repeatMonthly ? parseDateParts(nextPayday).day : null;
    await updateSettings({ nextPayday, paydayDay });
    showToast({ message: 'Jadwal kiriman diperbarui' });
  };

  const handleAdjustBalance = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseNominalInput(targetBalanceInput);
    if (parsed === null || parsed < 0 || parsed > MAX_AMOUNT) {
      setBalanceError('Masukkan saldo nyata antara Rp 0 sampai Rp 1.000.000.000');
      return;
    }

    setBalanceError(null);
    const tx = await createBalanceAdjustment({
      targetBalance: parsed,
      currentBalance: live.homeState.currentBalance,
      date: live.today,
    });

    setTargetBalanceInput('');
    if (!tx) {
      showToast({ message: 'Saldomu sudah sama dengan angka tersebut' });
      return;
    }

    showToast({
      message: `Saldo disesuaikan menjadi ${formatFull(parsed)}`,
    });
  };

  const openNewTemplate = () => {
    setEditingTpl(null);
    setTplLabel('');
    setTplAmountInput('');
    setTplCategoryId('cat-jajan');
    setTplError(null);
    setIsTplSheetOpen(true);
  };

  const openEditTemplate = (tpl: Template) => {
    setEditingTpl(tpl);
    setTplLabel(tpl.label);
    setTplAmountInput(String(tpl.amount));
    setTplCategoryId(tpl.categoryId);
    setTplError(null);
    setIsTplSheetOpen(true);
  };

  const handleSaveTemplate = async (e: FormEvent) => {
    e.preventDefault();
    const label = tplLabel.trim();
    if (!label) {
      setTplError('Nama template wajib diisi');
      return;
    }
    const amount = parseNominalInput(tplAmountInput);
    if (amount === null || !isValidAmount(amount)) {
      setTplError('Masukkan nominal yang wajar (mis. 12rb)');
      return;
    }

    if (editingTpl) {
      await updateTemplate(editingTpl.id, {
        label,
        amount,
        categoryId: tplCategoryId,
      });
      showToast({ message: `Template ${label} diperbarui` });
    } else {
      await createTemplate({
        label,
        amount,
        categoryId: tplCategoryId,
      });
      showToast({ message: `Template ${label} ditambahkan` });
    }

    setIsTplSheetOpen(false);
  };

  const handleExportJson = async () => {
    const json = await exportToJson();
    downloadBlob(
      json,
      `tanggal-tua-backup-${live.today}.json`,
      'application/json;charset=utf-8'
    );
    showToast({ message: 'Cadangan JSON berhasil diunduh' });
  };

  const handleExportCsv = async () => {
    const csv = await exportToCsv();
    downloadBlob(
      csv,
      `tanggal-tua-transaksi-${live.today}.csv`,
      'text/csv;charset=utf-8'
    );
    showToast({ message: 'Berkas CSV berhasil diunduh' });
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportStatus(null);

    try {
      const content = await file.text();
      const res = await importFromJson(content, importMode);
      setImportStatus(
        `Berhasil memulihkan data (${res.importedTransactions} transaksi diproses).`
      );
      showToast({ message: 'Data cadangan berhasil dipulihkan' });
    } catch (err: unknown) {
      setImportError(
        err instanceof Error ? err.message : 'Gagal membaca berkas cadangan.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmResetAll = async () => {
    await resetAllData(live.today);
    setResetStep(0);
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="space-y-5 py-4">
      <header>
        <h1 className="text-[20px] font-extrabold tracking-[-0.3px] text-[var(--ink)]">
          Pengaturan
        </h1>
        <p className="text-[13px] font-medium text-[var(--muted)]">
          Sesuaikan tampilan, jadwal kiriman, saldo, dan cadangan datamu.
        </p>
      </header>

      <InstallPwaButton variant="card" />

      {/* 1. Tampilan */}
      <section
        aria-labelledby="settings-theme-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2
          id="settings-theme-heading"
          className="text-[15px] font-extrabold text-[var(--ink)]"
        >
          Tampilan
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="settings-theme-heading"
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {THEME_OPTIONS.map((item, idx) => {
            const isChecked = currentTheme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isChecked}
                onClick={() => void handleThemeSelect(item.id)}
                onKeyDown={(e) => handleThemeKeyDown(e, idx)}
                style={
                  isChecked
                    ? {
                        backgroundColor: 'var(--primary)',
                        color: 'var(--on-primary)',
                        borderColor: 'var(--primary)',
                      }
                    : undefined
                }
                className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[16px] border px-2 text-[13px] font-extrabold transition-colors ${
                  isChecked
                    ? 'shadow-sm'
                    : 'border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)] hover:bg-[var(--border-soft)]'
                }`}
              >
                {isChecked && (
                  <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Kiriman */}
      <section
        aria-labelledby="settings-payday-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2
          id="settings-payday-heading"
          className="text-[15px] font-extrabold text-[var(--ink)]"
        >
          Jadwal Kiriman Berikutnya
        </h2>
        <form onSubmit={(e) => void handleSavePayday(e)} className="mt-3 space-y-3">
          <div>
            <label
              htmlFor="settings-payday-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Tanggal kiriman atau gajian
            </label>
            <input
              id="settings-payday-input"
              type="date"
              min={addDays(live.today, 1)}
              value={nextPayday}
              onChange={(e) => setNextPayday(e.target.value)}
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-bold text-[var(--ink)]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <input
              id="settings-payday-repeat"
              type="checkbox"
              checked={repeatMonthly}
              onChange={(e) => setRepeatMonthly(e.target.checked)}
              className="h-5 w-5"
            />
            <label
              htmlFor="settings-payday-repeat"
              className="text-[13px] font-bold text-[var(--ink)]"
            >
              Ulangi tiap bulan pada tanggal yang sama
            </label>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
            className="min-h-[44px] rounded-[20px] px-4 text-[13px] font-extrabold"
          >
            Simpan jadwal kiriman
          </button>
        </form>
      </section>

      {/* 3. Koreksi Saldo */}
      <section
        aria-labelledby="settings-balance-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <h2
          id="settings-balance-heading"
          className="text-[15px] font-extrabold text-[var(--ink)]"
        >
          Koreksi Saldo
        </h2>
        <p className="mt-1 text-[13px] font-medium text-[var(--muted)]">
          Saldo tercatat saat ini:{' '}
          <strong className="font-extrabold text-[var(--ink)]">
            {formatFull(live.homeState.currentBalance)}
          </strong>
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--muted)]">
          Selisihnya akan dicatat sebagai transaksi penyesuaian tanpa menghapus riwayat lama.
        </p>

        <form onSubmit={(e) => void handleAdjustBalance(e)} className="mt-3 space-y-2.5">
          <div>
            <label
              htmlFor="settings-target-balance"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Uang nyata yang kamu pegang sekarang
            </label>
            <div className="flex gap-2">
              <input
                id="settings-target-balance"
                type="text"
                inputMode="numeric"
                value={targetBalanceInput}
                onChange={(e) => {
                  setTargetBalanceInput(e.target.value);
                  if (balanceError) setBalanceError(null);
                }}
                placeholder="Contoh: 420rb atau 420000"
                className="min-h-[48px] min-w-0 flex-1 rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-bold text-[var(--ink)]"
              />
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="min-h-[48px] shrink-0 rounded-[16px] px-4 text-[13px] font-extrabold"
              >
                Sesuaikan
              </button>
            </div>
          </div>

          {balanceError && (
            <p role="alert" className="text-[12px] font-bold text-[var(--warm)]">
              {balanceError}
            </p>
          )}
        </form>
      </section>

      {/* 4. Kelola Template */}
      <section
        aria-labelledby="settings-template-heading"
        className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="settings-template-heading"
              className="text-[15px] font-extrabold text-[var(--ink)]"
            >
              Template Catat Cepat
            </h2>
            <p className="text-[12px] text-[var(--muted)]">
              3 template teratas tampil di Beranda.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewTemplate}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-[20px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[13px] font-extrabold text-[var(--ink)]"
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>Tambah</span>
          </button>
        </div>

        <ul className="mt-3 divide-y divide-[var(--border-soft)]">
          {live.templates.map((tpl, index) => (
            <li
              key={tpl.id}
              className="flex min-h-[54px] items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[var(--ink)]">
                  {tpl.label} ·{' '}
                  <span className="tabular-nums text-[var(--primary)]">
                    {formatShort(tpl.amount)}
                  </span>
                </p>
                <p className="text-[12px] text-[var(--muted)]">
                  {live.categoryMap.get(tpl.categoryId)?.name ?? 'Lainnya'} · dipakai{' '}
                  {tpl.usageCount}x
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => void reorderTemplate(tpl.id, 'up')}
                  aria-label={`Geser template ${tpl.label} ke atas`}
                  className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--ink)] disabled:opacity-30"
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={index === live.templates.length - 1}
                  onClick={() => void reorderTemplate(tpl.id, 'down')}
                  aria-label={`Geser template ${tpl.label} ke bawah`}
                  className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--ink)] disabled:opacity-30"
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => openEditTemplate(tpl)}
                  aria-label={`Ubah template ${tpl.label}`}
                  className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--ink)]"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTemplate(tpl.id)}
                  aria-label={`Hapus template ${tpl.label}`}
                  className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[var(--warm)]"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Data: Export / Import / Reset */}
      <section
        aria-labelledby="settings-data-heading"
        className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div>
          <h2
            id="settings-data-heading"
            className="text-[15px] font-extrabold text-[var(--ink)]"
          >
            Cadangan & Data Lokal
          </h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Berkas ekspor disimpan apa adanya tanpa enkripsi. Simpan di folder pribadimu.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleExportJson()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] border border-[var(--border-control)] bg-[var(--bg)] px-4 text-[13px] font-extrabold text-[var(--ink)] hover:bg-[var(--border-soft)]"
          >
            <Download size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Export JSON (Penuh)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportCsv()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] border border-[var(--border-control)] bg-[var(--bg)] px-4 text-[13px] font-extrabold text-[var(--ink)] hover:bg-[var(--border-soft)]"
          >
            <Download size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Export CSV (Excel)</span>
          </button>
        </div>

        <div className="border-t border-[var(--border-soft)] pt-3">
          <p className="text-[13px] font-extrabold text-[var(--ink)]">
            Pulihkan dari Berkas JSON
          </p>

          <div
            role="group"
            aria-label="Mode impor data"
            className="mt-2 grid grid-cols-2 gap-2"
          >
            <button
              type="button"
              aria-pressed={importMode === 'merge'}
              onClick={() => setImportMode('merge')}
              className={`min-h-[44px] rounded-[14px] border px-3 text-[12px] font-extrabold ${
                importMode === 'merge'
                  ? 'border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]'
                  : 'border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)]'
              }`}
            >
              Gabungkan data
            </button>
            <button
              type="button"
              aria-pressed={importMode === 'replace'}
              onClick={() => setImportMode('replace')}
              className={`min-h-[44px] rounded-[14px] border px-3 text-[12px] font-extrabold ${
                importMode === 'replace'
                  ? 'border-[var(--primary)] bg-[var(--primary-tint)] text-[var(--primary)]'
                  : 'border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)]'
              }`}
            >
              Ganti semua
            </button>
          </div>

          <div className="mt-2.5">
            <label
              htmlFor="settings-import-file"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[var(--border-control)] bg-[var(--bg)] px-4 text-[13px] font-extrabold text-[var(--ink)] hover:bg-[var(--border-soft)]"
            >
              <Upload size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>Pilih berkas JSON cadangan</span>
            </label>
            <input
              id="settings-import-file"
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleImportFile(e)}
              className="visually-hidden"
            />
          </div>

          {importStatus && (
            <p role="status" className="mt-2 text-[12px] font-bold text-[var(--primary)]">
              {importStatus}
            </p>
          )}
          {importError && (
            <p role="alert" className="mt-2 text-[12px] font-bold text-[var(--warm)]">
              {importError}
            </p>
          )}
        </div>

        <div className="border-t border-[var(--border-soft)] pt-3">
          {resetStep === 0 ? (
            <button
              type="button"
              onClick={() => setResetStep(1)}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--warm)] px-4 text-[13px] font-extrabold text-[var(--warm)]"
            >
              <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>Hapus semua data</span>
            </button>
          ) : (
            <div className="rounded-[18px] border border-[var(--warm)] bg-[var(--bg)] p-3.5">
              <p className="text-[13px] font-extrabold text-[var(--ink)]">
                {UI_STRINGS.deleteAllConfirm}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResetStep(0)}
                  className="min-h-[44px] flex-1 rounded-[16px] border border-[var(--border-control)] text-[13px] font-bold text-[var(--ink)]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmResetAll()}
                  style={{ backgroundColor: 'var(--warm)', color: '#FFFFFF' }}
                  className="min-h-[44px] flex-1 rounded-[16px] text-[13px] font-extrabold"
                >
                  Ya, hapus total
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Tentang */}
      <section
        aria-labelledby="settings-about-heading"
        className="flex items-center gap-3.5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <Mascot mood="smile" size={44} />
        <div>
          <h2
            id="settings-about-heading"
            className="text-[14px] font-extrabold text-[var(--ink)]"
          >
            {UI_STRINGS.appName} · Versi {__APP_VERSION__}
          </h2>
          <p className="text-[12px] font-medium text-[var(--muted)]">
            {UI_STRINGS.privacySummary} Tanpa server, tanpa akun, dan berfungsi penuh offline.
          </p>
        </div>
      </section>

      <Sheet
        open={isTplSheetOpen}
        onClose={() => setIsTplSheetOpen(false)}
        title={editingTpl ? 'Ubah Template' : 'Tambah Template'}
      >
        <form onSubmit={(e) => void handleSaveTemplate(e)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="settings-tpl-label"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nama template
            </label>
            <input
              id="settings-tpl-label"
              type="text"
              maxLength={40}
              value={tplLabel}
              onChange={(e) => {
                setTplLabel(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: Makan siang"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-tpl-amount"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal
            </label>
            <input
              id="settings-tpl-amount"
              type="text"
              inputMode="numeric"
              value={tplAmountInput}
              onChange={(e) => {
                setTplAmountInput(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: 15rb"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-tpl-cat"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Kategori
            </label>
            <select
              id="settings-tpl-cat"
              value={tplCategoryId}
              onChange={(e) => setTplCategoryId(e.target.value)}
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {tplError && (
            <p role="alert" className="text-[12px] font-bold text-[var(--warm)]">
              {tplError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTplSheetOpen(false)}
              className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
            >
              Simpan
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

export default SettingsPage;
