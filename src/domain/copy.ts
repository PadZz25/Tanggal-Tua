import { formatShort } from './money';
import type { HomeStateKind, ParseErrorCode } from './types';

export const MASCOT_MESSAGES: Record<HomeStateKind, readonly string[]> = {
  normal: [
    'Masih aman. Satu kopi lagi masih boleh.',
    'Santai, jatah hari ini masih longgar.',
    'Pelan-pelan aja, kamu di jalur.',
  ],
  fresh: ['Hari baru, jatah penuh. Yuk jajan seperlunya.'],
  'tanggal-tua': [
    'Tanggal tua nih. Tarik napas, kita atur bareng.',
    'Sisa dikit, tapi masih cukup kalau dipilih-pilih.',
  ],
  over: ['Hari ini lewat {overAmount}. Tenang, jatah besok kita sesuaikan.'],
  broke: ['Dompet lagi kosong. Kita cari jalan pelan-pelan.'],
  'payday-needed': ['Kiriman udah masuk? Catat dulu biar jatahnya akurat.'],
};

function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getMascotCopy(params: {
  state: HomeStateKind;
  today: string;
  remainingToday?: number;
}): string {
  const templates = MASCOT_MESSAGES[params.state];
  const index = hashDateString(params.today) % templates.length;
  const chosen = templates[index];

  if (params.state === 'over') {
    const overAbs = Math.abs(params.remainingToday ?? 0);
    const formatted = formatShort(overAbs, { withPrefix: true });
    return chosen.replace('{overAmount}', formatted);
  }

  return chosen;
}

export const PARSER_HINTS: Record<ParseErrorCode, string> = {
  EMPTY: 'Ketik pengeluaranmu, mis. kopi 18rb',
  NO_AMOUNT: 'Tambah nominal, mis. 10rb',
  MULTIPLE_AMOUNTS: 'Catat satu per satu dulu ya',
  OUT_OF_RANGE: 'Nominalnya di luar batas wajar',
  INVALID_AMOUNT: 'Nominalnya belum terbaca',
  BEFORE_OPENING_DATE:
    'Saldo awalmu dihitung mulai hari ini. Transaksi kemarin tidak perlu dicatat lagi.',
};

export const UI_STRINGS = {
  appName: 'Tanggal Tua',
  tagline: 'Bertahan sampai kiriman berikutnya.',
  heroLabelNormal: 'Jatah hari ini',
  remainingBalanceLabel: 'Sisa uang',
  heroBadgeTanggalTua: 'Mode Tanggal Tua',
  quickSectionLabel: 'Catat cepat',
  todaySectionTitle: 'Hari ini',
  seeAllLink: 'Lihat semua',
  quickInputPlaceholder: 'Ketik: kopi 18rb',
  quickInputLabel: 'Catat transaksi cepat',
  undoButton: 'Batalkan',
  emptyToday: 'Belum ada catatan hari ini. Yuk catat yang pertama.',
  emptyHistory: 'Belum ada riwayat transaksi yang cocok.',
  emptySummary: 'Belum ada catatan di periode ini. Yuk catat dulu.',
  summaryNoExpense: 'Belum ada pengeluaran',
  summaryTitle: 'Ringkasan',
  summaryPeriodWeek: 'Minggu',
  summaryPeriodMonth: 'Bulan',
  summaryTotalExpense: 'Total keluar',
  summaryTotalIncome: 'Total masuk',
  summaryNet: 'Selisih',
  summaryAvgPerDay: 'Rata-rata per hari',
  summaryCategoryTitle: 'Pengeluaran per kategori',
  summaryDailyTitle: 'Pengeluaran per hari',
  privacySummary: 'Datamu hanya ada di perangkat ini.',
  deleteAllConfirm: 'Hapus semua data? Ini tidak bisa dibatalkan.',
  paydayPrompt: 'Kiriman sudah masuk? Catat',
  setNextPaydayCta: 'Atur kiriman berikutnya',
  recordIncomeCta: 'Catat pemasukan',
  pwaUpdateAvailable: 'Versi baru tersedia · Muat ulang',
} as const;
