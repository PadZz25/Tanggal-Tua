# Tanggal Tua — Spesifikasi Project

> Dokumen ini adalah **satu-satunya sumber kebenaran** untuk membangun aplikasi **Tanggal Tua**. Ditulis untuk dibaca oleh AI agent coding.
> Versi 1.1 · 18 November 2026 · Bahasa dokumen: Indonesia (identifier kode dan nama file: Inggris).

---

## 0. Cara memakai dokumen ini (instruksi untuk AI agent)

1. **Baca seluruh dokumen sebelum menulis kode.** Jangan mulai dari bagian tengah.
2. Kerjakan **per milestone berurutan** (bagian 17). Satu milestone dianggap selesai bila: build lulus, lint lulus, semua test lulus, dan acceptance criteria milestone terpenuhi. Commit di akhir tiap milestone.
3. **Jangan menambah fitur di luar scope** (bagian 4). Jika sesuatu ambigu, pilih default di bagian 19, lalu catat keputusanmu di `docs/DECISIONS.md` (format: tanggal, keputusan, alasan).
4. **Logika bisnis harus berupa fungsi murni** di `src/domain/` (tanpa React, tanpa akses database) dan harus punya unit test. Aturan di bagian 5 dan 6 adalah kontrak, bukan saran.
5. Semua teks yang dilihat pengguna memakai **Bahasa Indonesia santai** sesuai panduan di bagian 12. Identifier, komentar kode, dan nama file memakai bahasa Inggris.
6. **Tanpa backend, tanpa akun, tanpa analytics, tanpa panggilan jaringan ke pihak ketiga saat runtime.** Font dan aset di-host sendiri (aplikasi harus berfungsi penuh offline).
7. Jangan menambah dependency berat tanpa alasan. Setiap dependency di luar bagian 8 harus dicatat di `docs/DECISIONS.md`.
8. Jangan menyimpan secret atau data pengguna nyata di repository.
9. Bila kamu perlu bertanya ke pemilik project, kumpulkan semua pertanyaan di akhir milestone, jangan berhenti di tengah pekerjaan.

---

## 1. Ringkasan produk

| Item | Isi |
|---|---|
| Nama kerja | **Tanggal Tua** (nama sementara; simpan di satu konstanta `APP_NAME`, ketersediaan domain/merek belum dicek) |
| Tagline | "Bertahan sampai kiriman berikutnya." |
| Jenis | Progressive Web App (PWA), mobile-first, local-first |
| Target pengguna | Mahasiswa dan Gen Z di Indonesia (uang saku/kiriman bulanan, gaji pertama) |
| Tujuan project | Portofolio dan pembelajaran (kualitas kode, UX, dan cerita project lebih penting daripada jumlah fitur) |
| Bahasa & mata uang | Indonesia, Rupiah (IDR) saja |

**Satu kalimat:** money tracker yang menjawab satu pertanyaan sehari-hari: *"Hari ini aku masih boleh jajan berapa?"*

**Masalah yang diselesaikan**
- Kebanyakan orang berhenti memakai aplikasi pencatat keuangan dalam beberapa minggu karena mencatat terasa seperti kerja input data.
- Mahasiswa butuh angka yang langsung bisa dipakai memutuskan ("sisa jatah hari ini"), bukan laporan akuntansi.
- Banyak aplikasi memaksa koneksi bank sejak awal, sehingga privasi dan penggunaan offline jadi nomor dua.

**Inti produk (jangan diubah tanpa persetujuan pemilik)**
1. **Sisa jatah harian**: satu angka besar di layar utama, dihitung dari uang yang dipegang dan jumlah hari sampai kiriman/gajian berikutnya.
2. **Catat dalam 5 detik**: ketik gaya chat ("kopi 18rb"), template satu tap, dan suara (P2).
3. **Local-first dan privat**: data hanya di perangkat pengguna, bisa offline, bisa export/import.

---

## 2. Latar belakang dan riset (ringkas)

Bagian ini menjelaskan *mengapa* keputusan produk diambil, agar agent tidak "memperbaiki" hal yang disengaja.

**Peta pesaing (hasil riset November 2026)**
- Global: Monarch Money, YNAB, EveryDollar, Rocket Money, Quicken Simplifi, Money Manager, Splitwise (patungan). Mint dihentikan Intuit sejak 2024, sehingga ada celah "pengganti Mint".
- Indonesia: Money Lover, Wallet, Spendee, Monefy, DompetKu, Finansialku. DompetKu dinilai tampilannya masih sederhana dan kurang dukungan multi-perangkat/backup cloud.

**Celah pasar yang diambil**
- Privasi: tanpa koneksi bank wajib; data lokal.
- Offline: berfungsi penuh tanpa internet.
- Friksi input: parser teks gaya chat, template satu tap, (nanti) suara.
- Konteks lokal: istilah "tanggal tua", "kiriman", "jajan", "kosan", "paketan", "patungan"; format "18rb", "1,5jt".
- Hasil yang langsung dipakai: sisa jatah harian, bukan laporan.

**Tren desain 2026 yang dipakai**
- Minimalis dan tenang (angka besar, ruang kosong, satu aksi utama per layar).
- Personalisasi ringan (tema warna, maskot).
- Dark mode setara dengan light mode; permukaan "kaca" halus.
- Onboarding sangat singkat (satu pertanyaan per layar).
- Aksesibilitas serius (kontras, target sentuh besar).
- Gamifikasi yang bertanggung jawab (tanpa rasa bersalah).
- (Nanti) AI yang bisa menjelaskan alasannya, bukan chatbot generik.

---

## 3. Prinsip produk

1. **Satu angka dulu.** Layar utama = sisa jatah hari ini. Detail menyusul.
2. **Cepat atau tidak dipakai.** Setiap alur pencatatan harus bisa selesai ≤ 5 detik dan ≤ 2 tap/ketikan setelah app terbuka.
3. **Tanpa rasa bersalah.** Tidak ada kata menghakimi, tidak ada merah menyala yang agresif, tidak ada hukuman streak.
4. **Data milik pengguna.** Lokal, bisa diexport, bisa dihapus total.
5. **Jujur soal angka.** Semua angka berasal dari rumus yang bisa dijelaskan (bagian 5). Tidak ada angka karangan.
6. **Hangat tapi rapi.** Tenang di struktur, hangat di detail, premium di material, lokal di bahasa.

---

## 4. Scope

### 4.1 MVP (P0) — wajib
| ID | Fitur | Ringkas |
|---|---|---|
| F1 | Onboarding | 3 layar: uang dipegang sekarang, tanggal kiriman berikutnya, (opsional) tema. Lalu tampilkan jatah harian pertama. |
| F2 | Beranda | Kartu jatah hari ini, catat cepat (template), daftar "Hari ini", input teks cepat, navigasi bawah. |
| F3 | Quick-add teks | Parser gaya chat (bagian 6) + konfirmasi lewat toast "Batalkan". |
| F4 | Template satu tap | Chip template; tap = langsung tersimpan + toast "Batalkan". |
| F5 | Form transaksi | Tambah/ubah/hapus lengkap (nominal, jenis, kategori, catatan, tanggal). |
| F6 | Riwayat | Daftar dikelompokkan per hari, filter jenis, ubah/hapus dengan undo. |
| F7 | Pengaturan | Tema (Sistem/Terang/Gelap), tanggal kiriman, koreksi saldo, kelola template, export/import, hapus semua data, tentang. |
| F8 | Mode tanggal tua | Tampilan dan copy khusus saat jatah menipis (bagian 5.3). |
| F9 | PWA offline | Bisa diinstal, berfungsi penuh offline, font di-host sendiri. |
| F10 | Export/Import | JSON penuh (berversi) dan CSV transaksi. |
| F11 | Ringkasan (0.3.0) | Ringkasan mingguan/bulanan, chart donut per kategori, chart batang harian, perbandingan adil periode lalu, serta filter kategori+rentang di Riwayat. |

### 4.2 P1 — setelah MVP stabil
- **Patungan dan utang teman** (catat "Budi utang 35rb", tandai lunas, bagi tagihan rata).
- Transaksi berulang (gaji, cicilan, langganan).
- Kategori kustom (nama, ikon, warna).
- Pencarian di riwayat.
- Streak mencatat yang ramah (tanpa hukuman).
- Insight berbasis aturan yang bisa dijelaskan dengan angka ("Jajan minggu ini naik 20% dari minggu lalu: Rp 120rb vs Rp 100rb").
- Pengingat backup (setiap 30 hari tanpa export).
- Tata letak desktop (kolom tengah maksimum 480px).
- Pemisahan beberapa nominal dalam satu input ("es teh 4rb dan parkir 2rb").
- Tema warna tambahan dan variasi ekspresi maskot.

### 4.3 P2 — opsional
- Input suara (Web Speech API, `id-ID`) yang diumpankan ke parser yang sama.
- Dashboard modular (widget bisa disematkan).
- Sinkronisasi opsional antar perangkat (end-to-end encrypted) dan enkripsi data lokal dengan passphrase.
- Insight berbantuan AI yang menjelaskan alasannya.
- Scan struk.

### 4.4 Non-goals (JANGAN dibangun)
- Koneksi bank/e-wallet, scraping notifikasi, atau integrasi QRIS.
- Multi-mata-uang, investasi, kripto, pajak, akuntansi bisnis.
- Akun/login, backend, database server, iklan, analytics pihak ketiga.
- Fitur sosial/publik.

---

## 5. Konsep inti dan aturan bisnis (KONTRAK)

### 5.1 Definisi
- **Rupiah** disimpan sebagai **integer** (tanpa desimal, tanpa float).
- **Tanggal** disimpan sebagai string lokal `YYYY-MM-DD` (zona waktu perangkat; Indonesia tidak memakai DST). Waktu kejadian disimpan juga sebagai ISO string.
- `today` = tanggal lokal perangkat saat ini.
- `nextPayday` = tanggal kiriman/gajian berikutnya (`YYYY-MM-DD`).
- `daysLeft = nextPayday − today` dalam hari kalender. Hari ini dihitung, hari kiriman tidak dihitung. Contoh: 18 Nov → 1 Des = **13 hari**.
- `currentBalance = openingBalance + Σincome + Σadjustment − Σexpense` (semua transaksi, yang tanggalnya ≥ `openingDate`).
- `spentToday = Σ expense` dengan `date == today` (income dan adjustment tidak dihitung).

### 5.2 Rumus jatah harian
```
dailyAllowance = floor( (currentBalance + spentToday) / daysLeft )     // jika currentBalance + spentToday < 0 → 0
remainingToday = dailyAllowance − spentToday
usedRatio      = clamp(spentToday / dailyAllowance, 0, 1)              // jika dailyAllowance == 0 → 1
```
Sifat penting: menambah pengeluaran hari ini **tidak mengubah** `dailyAllowance` hari itu (hanya `remainingToday`). Menambah pemasukan hari ini **menaikkan** `dailyAllowance`. Pengeluaran berlebih hari ini otomatis **menurunkan jatah hari-hari berikutnya** (karena `currentBalance` turun).

**Contoh uji (wajib jadi unit test):**
| Kasus | Input | Hasil |
|---|---|---|
| Normal | today=2026-11-18, nextPayday=2026-12-01, currentBalance=816000, spentToday=29000 | dailyAllowance=65000, remainingToday=36000 |
| Tanggal tua | daysLeft=4, currentBalance=166000, spentToday=42000 | dailyAllowance=52000, remainingToday=10000 (19,2% → mode tanggal tua) |
| Lewat jatah | daysLeft=4, currentBalance=148000, spentToday=60000 | dailyAllowance=52000, remainingToday=−8000 (state `over`) |
| Hari baru | currentBalance=845000, spentToday=0, daysLeft=13 | dailyAllowance=65000, remainingToday=65000 |
| Saldo minus | currentBalance=−20000, spentToday=0 | dailyAllowance=0 (state `broke`) |
| Kiriman hari ini/lewat | nextPayday ≤ today | state `payday-needed` (tanpa angka jatah) |

### 5.3 State beranda (hasil fungsi murni `getHomeState`)
| State | Kondisi (urutan prioritas) | Perilaku tampilan |
|---|---|---|
| `payday-needed` | `nextPayday ≤ today` | Kartu hero menampilkan saldo dan tombol "Atur kiriman berikutnya". Tidak ada angka jatah. |
| `broke` | `currentBalance + spentToday ≤ 0` | Jatah Rp 0, copy lembut, tombol "Catat pemasukan". |
| `over` | `remainingToday < 0` | Hero warna hangat (`--warm`), angka menampilkan "−Rp Xrb", progress penuh. |
| `tanggal-tua` | `dailyAllowance < tanggalTuaThreshold` ATAU `remainingToday ≤ 20% × dailyAllowance` | Hero warna hangat, badge "Mode Tanggal Tua", maskot ekspresi datar, copy menenangkan. |
| `fresh` | `spentToday == 0` | Hero normal, copy "hari baru". |
| `normal` | lainnya | Hero indigo, copy ringan. |

`tanggalTuaThreshold` default **Rp 30.000**, bisa diubah di Pengaturan (P1).

### 5.4 Kasus tepi
- **Tengah malam:** hitung ulang `today` saat app kembali aktif (`visibilitychange`) dan dengan timer yang menembak tepat pukul 00:00 lokal.
- **Transaksi bertanggal mundur:** boleh, tetapi tanggal minimum = `openingDate`. Tanggal masa depan **tidak** boleh (P0).
- **Koreksi saldo:** membuat transaksi `adjustment` bertanda (positif/negatif) agar riwayat tetap konsisten; jangan menimpa `openingBalance`.
- **Hapus transaksi:** hapus keras setelah toast "Batalkan" kedaluwarsa (5 detik). Selama toast aktif, tampilan sudah memperlihatkan keadaan setelah hapus.
- **Batas nominal:** 1 ≤ nominal ≤ 1.000.000.000. Di luar itu: tolak dengan pesan ramah.
- **Kiriman berulang:** pengaturan jadwal pada `settings`: `paydayRepeat` (`'none' | 'monthly' | 'weekly'`), `paydayDay` (`1..31`, untuk `'monthly'`; jika bulan lebih pendek pakai hari terakhir bulan), dan `paydayWeekday` (`1..7`, dengan `1 = Senin` s.d. `7 = Minggu`, untuk `'weekly'`). Pada mode mingguan, `nextPayday` adalah kemunculan pertama hari yang dipilih **setelah** hari ini (hari ini tidak dihitung, sehingga `daysLeft` selalu `1..7`). Saat `nextPayday` terlewati/tiba pada mode berulang, geser otomatis ke kemunculan berikutnya (+7 hari sampai `> today` untuk mingguan, atau bulan berikutnya untuk bulanan) **dan** tampilkan prompt `"Kiriman sudah masuk? Catat"` (tidak membuat pemasukan otomatis). Baris settings lama tanpa `paydayRepeat` dinormalisasi menjadi `'monthly'` jika `paydayDay != null`, selain itu `'none'`.
- **Data kosong:** state kosong wajib ada untuk Beranda dan Riwayat, dengan maskot.

### 5.5 Format angka (fungsi `formatRupiah*` di `src/domain/money.ts`)
- **Pendek** (`formatShort`): `<1.000` → `Rp 750`; kelipatan 1.000 → `36rb`; bukan kelipatan → satu desimal koma `36,5rb`; `≥1.000.000` → `1,5jt` (maksimal 2 desimal, nol di belakang dibuang). Tanda minus memakai karakter `−` (U+2212). Awalan "Rp " dipakai di angka besar hero ("Rp 36rb"), tidak di daftar transaksi ("−15rb").
- **Penuh** (`formatFull`): `Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0})`, contoh "Rp 36.000".
- **Tanggal pendek:** "1 Des", "18 Nov" (bulan: Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des).

---

## 6. Parser quick-add (KONTRAK)

Fungsi murni: `parseQuickAdd(input: string, ctx: { today: string; categories: Category[] }): ParseResult`.

```ts
type ParseResult =
  | { ok: true; type: 'expense' | 'income'; amount: number; note: string; categoryId: string; date: string; }
  | { ok: false; error: 'EMPTY' | 'NO_AMOUNT' | 'INVALID_AMOUNT' | 'MULTIPLE_AMOUNTS' | 'OUT_OF_RANGE'; hint: string };
```

### 6.1 Aturan nominal
Kandidat nominal adalah token yang cocok salah satu bentuk berikut (huruf besar/kecil diabaikan):
1. Angka + satuan: `rb`, `ribu`, `k`, `jt`, `juta` — boleh ada spasi sebelum satuan (`10 rb`). Desimal dengan koma **atau** titik (`1,5jt`, `1.5jt`, `2,5rb`).
2. Awalan `rp` (opsional spasi): `rp25.000`, `rp 25000`.
3. Angka polos **≥ 1000** setelah titik ribuan dibuang: `18000`, `18.000`.

Angka polos **< 1000 tanpa satuan** diabaikan (dianggap jumlah/porsi: "bakso 2 porsi 20rb" → nominal 20rb). Tanpa satuan, titik adalah pemisah ribuan (`1.500` = 1500), bukan desimal.
- 0 kandidat → `NO_AMOUNT` (hint: "Tambah nominal, mis. 10rb").
- >1 kandidat → `MULTIPLE_AMOUNTS` (hint: "Catat satu per satu dulu ya"). Pemisahan otomatis adalah P1.
- Nominal 0 atau di luar batas → `INVALID_AMOUNT` / `OUT_OF_RANGE`.

### 6.2 Jenis (expense/income)
Urutan prioritas penentuan jenis (pencocokan per token/frasa utuh setelah normalisasi huruf kecil dan pembuangan tanda baca kecuali pemisah angka):
1. Nominal berawalan `+` → `income`.
2. Ada penanda pengeluaran → `expense`. Penanda: `beli`, `bayar`, `tiket`, `traktir`, `donasi`, `diskon`, `promo`, `voucher`, `potongan`, dan pola arah `ke <orang>` (`transfer ke ortu`, `kirim ke teman`).
3. Ada kata kunci pemasukan KUAT → `income`: `gaji`, `gajian`, `kiriman`, `uang saku`, `beasiswa`, `freelance`, `honor`, `upah`, `bonus`, `thr`, `angpao`, `angpau`, `hadiah`, `komisi`, `bayaran`, `penghasilan`, `pendapatan`, `pemasukan`, `cashback`, `refund`, `ngelesin`, `transfer masuk`, `uang masuk`, `dana masuk`, `transfer dari`, `dari ortu`, `dikirimin`, `dikirim ortu`.
4. Ada kata kunci pemasukan LEMAH → `income`: `dapat`, `dapet`, `terima`, `diterima`, `nerima`, `dikasih`.
5. Selain itu → `expense`.

### 6.3 Tanggal
Default `today`. Kata `kemarin` → `today − 1`. Kata lain tidak ditangani di MVP. Kata penanggalan dibuang dari catatan.

### 6.4 Catatan dan kategori
`note` = teks tersisa setelah nominal, awalan jenis, dan kata tanggal dibuang, dirapikan spasinya, huruf pertama kapital. Jika kosong → "Pengeluaran" / "Pemasukan". Kategori dipilih dari kata kunci (7.3) dengan pencocokan token utuh; bila ada beberapa, pakai yang muncul pertama; bila tidak ada → kategori "Lainnya".

### 6.5 Tabel kasus uji (wajib jadi unit test)
| Input | Hasil |
|---|---|
| `kopi 18rb` | expense, 18000, "Kopi", Jajan |
| `kopi susu 18.000` | expense, 18000, "Kopi susu", Jajan |
| `makan siang 15k` | expense, 15000, "Makan siang", Makan |
| `parkir 2rb` | expense, 2000, Transport |
| `bensin 20000` | expense, 20000, Transport |
| `nasi 10 rb` | expense, 10000, Makan |
| `rp 25.000 bakso` | expense, 25000, "Bakso", Makan |
| `bakso 2 porsi 20rb` | expense, 20000 |
| `kiriman ortu 1,5jt` | income, 1500000, Kiriman ortu |
| `+500rb freelance` | income, 500000 |
| `kopi 18rb kemarin` | expense, 18000, date = today−1, note "Kopi" |
| `1.500` | expense, 1500, note "Pengeluaran", Lainnya |
| `2,5rb` | expense, 2500 |
| `18rb` | expense, 18000, note "Pengeluaran" |
| `kopi` | error `NO_AMOUNT` |
| `nasi 10` | error `NO_AMOUNT` |
| `es teh 4rb dan parkir 2rb` | error `MULTIPLE_AMOUNTS` |
| `kopi 0` | error `NO_AMOUNT` (0 < 1000 diabaikan) |
| `   ` | error `EMPTY` |

### 6.6 Perilaku UI quick-add
- Tekan Enter/tombol kirim: parse → jika `ok`, simpan, kosongkan input, tampilkan toast "Tersimpan · {note} −{nominal}" dengan tombol **Batalkan** (5 detik), getaran halus bila tersedia (`navigator.vibrate?.(10)`).
- Jika error: tampilkan `hint` sebagai teks bantu di bawah input (bukan modal), fokus tetap di input.
- Pratinjau langsung saat mengetik (opsional): tampilkan chip kecil "Jajan · Rp 18rb" bila parse valid.

---

## 7. Model data

Penyimpanan: **IndexedDB** via **Dexie**. Semua ID: `crypto.randomUUID()`.

```ts
type TransactionType = 'expense' | 'income' | 'adjustment';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;          // integer rupiah. expense/income selalu > 0. adjustment bertanda (+/−), ≠ 0.
  categoryId: string | null; // null untuk adjustment
  note: string;            // maks 80 karakter
  date: string;            // 'YYYY-MM-DD' lokal
  occurredAt: string;      // ISO 8601
  source: 'quick' | 'form' | 'template' | 'voice';
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  kind: 'expense' | 'income';
  name: string;
  icon: string;            // nama ikon Lucide
  tone: string;            // kunci token warna kategori (lihat 11.1)
  keywords: string[];      // huruf kecil, untuk parser
  order: number;
  isDefault: boolean;
}

interface Template {
  id: string;
  label: string;           // "Kopi"
  amount: number;          // 12000
  categoryId: string;
  order: number;
  usageCount: number;
}

interface Settings {       // satu baris, id = 'main'
  id: 'main';
  schemaVersion: number;
  hasOnboarded: boolean;
  openingBalance: number;
  openingDate: string;
  nextPayday: string;
  paydayRepeat: 'none' | 'monthly' | 'weekly';
  paydayDay: number | null;      // 1–31 untuk 'monthly'
  paydayWeekday: number | null;  // 1–7 (1 = Senin .. 7 = Minggu) untuk 'weekly'
  tanggalTuaThreshold: number;   // default 30000
  theme: 'system' | 'light' | 'dark';
  lastExportAt: string | null;
}
```

**P1 (disiapkan skemanya, belum dipakai di MVP):**
```ts
interface Person { id: string; name: string; createdAt: string; }
interface Debt {
  id: string; personId: string;
  direction: 'owed_to_me' | 'i_owe';
  amount: number; note: string;
  createdAt: string; settledAt: string | null;
}
```

**Dexie schema v1**
```
transactions: 'id, date, type, categoryId, createdAt'
categories:   'id, kind, order'
templates:    'id, order'
settings:     'id'
```
Migrasi: tiap perubahan skema menaikkan versi Dexie dengan fungsi `upgrade`; `schemaVersion` di export JSON wajib selalu ada.

### 7.1 Kategori default (seed)
**Pengeluaran:** Makan, Jajan, Transport, Kosan, Paketan, Kuliah, Belanja, Hiburan, Lainnya.
**Pemasukan:** Kiriman ortu, Gaji/Freelance, Beasiswa, Lainnya.

### 7.2 Template default (seed)
Kopi 12.000 (Jajan), Parkir 2.000 (Transport), Makan 15.000 (Makan). Chip di Beranda menampilkan maksimal 3 template dengan `usageCount` tertinggi (tie-break: `order`), ditambah tombol "+".

### 7.3 Kata kunci parser default
| Kategori | Kata kunci |
|---|---|
| Makan | makan, nasi, ayam, soto, bakso, mie, warteg, kantin, sarapan, geprek |
| Jajan | kopi, kopi susu, es teh, boba, jajan, snack, cemilan, gorengan, minum |
| Transport | parkir, bensin, ojol, ojek, angkot, bus, krl, tol |
| Kosan | kos, kosan, sewa, listrik, air |
| Paketan | pulsa, paketan, kuota, wifi, internet |
| Kuliah | fotokopi, print, buku, ukt, spp, modul |
| Belanja | belanja, indomaret, alfamart, skincare, baju |
| Hiburan | nonton, bioskop, game, spotify, netflix, nongkrong |
| Kiriman ortu | kiriman, uang saku, dari ortu, dikirimin, dikirim ortu |
| Gaji/Freelance | gaji, gajian, freelance, honor, upah, komisi, bayaran, penghasilan, pendapatan, ngelesin |
| Beasiswa | beasiswa |

### 7.4 Format export JSON
```json
{ "app": "tanggal-tua", "schemaVersion": 1, "exportedAt": "2026-11-18T08:30:00Z",
  "settings": {}, "categories": [], "templates": [], "transactions": [] }
```
Validasi saat import dengan **Zod**. Mode import: *Gabungkan* (lewati ID yang sudah ada) atau *Ganti semua* (dengan konfirmasi). Import gagal tidak boleh mengubah data apa pun (lakukan dalam satu transaksi Dexie).
Export CSV: kolom `date,type,amount,category,note`, UTF-8 dengan BOM agar terbuka benar di Excel.

---

## 8. Tech stack (default; boleh diganti hanya jika pemilik project menentukan lain)

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Bahasa | **TypeScript** (`strict: true`) | |
| UI | **React** + **Vite** | Gunakan versi stabil terbaru. |
| Routing | **React Router** | |
| Styling | **Tailwind CSS** + CSS variables untuk token | Token di `src/styles/tokens.css` (bagian 11). |
| Ikon | **lucide-react** | |
| Data lokal | **Dexie** + `dexie-react-hooks` | |
| State UI | **Zustand** (hanya untuk state UI sementara: sheet, toast) | Data bisnis dibaca dari Dexie, bukan di-cache di Zustand. |
| Validasi | **Zod** | Import/export dan form. |
| Tanggal | **date-fns** (locale `id`) | |
| PWA | **vite-plugin-pwa** (Workbox) | |
| Font | **@fontsource/plus-jakarta-sans** (bobot 500, 600, 700, 800) | Self-host, subset Latin. |
| Test | **Vitest** + Testing Library; **Playwright** untuk e2e | |
| Kualitas | ESLint + Prettier + `tsc --noEmit` | |
| Package manager | **pnpm** | |
| Hosting | Static hosting (Cloudflare Pages / Netlify / Vercel — pilih satu) | |

---

## 9. Struktur folder dan arsitektur

```
tanggal-tua/
├─ public/                    # ikon PWA (192, 512, maskable), favicon, og-image
├─ src/
│  ├─ app/                    # App.tsx, router.tsx, providers, theme bootstrap
│  ├─ domain/                 # FUNGSI MURNI (tanpa React/Dexie) + test
│  │  ├─ money.ts             # formatShort, formatFull, parse helper
│  │  ├─ dates.ts             # today(), daysBetween(), rollPayday(), formatShortDate()
│  │  ├─ allowance.ts         # computeAllowance(), getHomeState()
│  │  ├─ summary.ts           # getPeriodRange(), shiftPeriod(), summarize(), comparePeriods()
│  │  ├─ parser/
│  │  │  ├─ parseQuickAdd.ts
│  │  │  ├─ keywords.ts
│  │  │  └─ parseQuickAdd.test.ts
│  │  └─ copy.ts              # pemilihan pesan maskot per state (deterministik per hari)
│  ├─ data/                   # akses data
│  │  ├─ db.ts                # skema Dexie + migrasi
│  │  ├─ seed.ts              # kategori & template default
│  │  ├─ repositories/        # transactions.ts, templates.ts, settings.ts, categories.ts
│  │  ├─ exportImport.ts      # JSON + CSV, validasi Zod
│  │  └─ schemas.ts           # skema Zod
│  ├─ features/
│  │  ├─ onboarding/
│  │  ├─ home/                # HeroCard, QuickChips, TodayList, QuickAddBar
│  │  ├─ transactions/        # TransactionSheet (form), TransactionRow
│  │  ├─ history/
│  │  ├─ summary/             # SummaryPage, CategoryDonutChart, DailyExpenseChart, chartColors
│  │  ├─ settings/
│  │  └─ settle-up/           # P1: patungan & utang teman
│  ├─ components/
│  │  ├─ ui/                  # Button, Chip, Card, Sheet, Toast, ProgressBar, Switch, EmptyState
│  │  ├─ brand/               # Mascot (Receh), Wordmark
│  │  └─ layout/              # AppShell, BottomNav
│  ├─ hooks/                  # useToday (midnight-aware), useHomeState, useTheme
│  ├─ lib/                    # pwa.ts, haptics.ts, speech.ts (P2)
│  ├─ styles/                 # tokens.css, globals.css
│  └─ test/                   # setup, fixtures
├─ e2e/                       # Playwright
├─ docs/
│  ├─ SPEC.md                 # salinan dokumen ini
│  ├─ DECISIONS.md            # keputusan agent (tanggal, keputusan, alasan)
│  └─ CASE-STUDY.md           # kerangka cerita portofolio (bagian 18.3)
├─ .github/                   # workflows/ci.yml, ISSUE_TEMPLATE/, pull_request_template.md, dependabot.yml (bagian 21.2)
├─ README.md
├─ LICENSE
├─ CHANGELOG.md
├─ CONTRIBUTING.md
├─ SECURITY.md
├─ .gitignore  .editorconfig  .nvmrc
└─ (vite.config.ts, tsconfig.json, eslint, prettier, playwright.config.ts, pnpm-lock.yaml)
```

**Aturan arsitektur**
- Aliran dependensi satu arah: `components/features` → `domain` dan `data`; `domain` tidak boleh meng-import apa pun dari `data`, `features`, atau React.
- `features/*` mengakses data hanya lewat `data/repositories/*`.
- Perhitungan (jatah, state) dilakukan di `domain` dari data mentah; komponen hanya menampilkan hasilnya.
- Semua string UI lewat satu modul `src/domain/strings.ts` (atau `copy.ts`) agar mudah ditinjau dan diubah.
- Komponen presentasional tidak memanggil Dexie langsung.

---

## 10. Halaman, alur, dan komponen

### 10.1 Rute
| Rute | Halaman | Catatan |
|---|---|---|
| `/onboarding` | Onboarding | Hanya jika `hasOnboarded == false`; selain itu redirect ke `/`. |
| `/` | Beranda | |
| `/riwayat` | Riwayat | Mendukung query `?kategori=<id>&dari=<start>&sampai=<end>`. |
| `/ringkasan` | Ringkasan | Lazy-loaded; query `?periode=minggu|bulan&tanggal=YYYY-MM-DD`. |
| `/patungan` | Patungan | P1. Perlu keputusan navigasi saat dibangun karena 4 slot bawah sudah penuh. |
| `/pengaturan` | Pengaturan | |
| (sheet) | Form transaksi | Bottom sheet, bukan rute terpisah (boleh query param `?edit=<id>` agar tombol back bekerja). |

Navigasi bawah (4 item, tinggi 64px): **Beranda, Riwayat, Ringkasan, Pengaturan**.

### 10.2 Onboarding (F1)
Satu pertanyaan per layar, tombol utama besar, indikator langkah.
1. "Uang yang kamu pegang sekarang berapa?" → input nominal (boleh gaya "850rb", memakai parser nominal yang sama). Menyimpan `openingBalance` dan `openingDate = today`.
2. "Kiriman/gajian berikutnya tanggal berapa?" → kontrol **Ulangi** (`Tidak | Tiap minggu | Tiap bulan`). Pada `Tidak` atau `Tiap bulan`: tampilkan pemilih tanggal (default: tanggal 1 bulan depan) dan simpan `paydayDay` (jika bulanan). Pada `Tiap minggu`: sembunyikan pemilih tanggal, tampilkan 7 chip hari (`Sen` s.d. `Min`), hitung `nextPayday` otomatis beserta pratinjau `"Kiriman berikutnya: {Hari}, {tanggal} ({n} hari lagi)"`.
3. (Opsional, boleh dilewati) pilih tema Sistem/Terang/Gelap.
Penutup: layar "Jatah harianmu: Rp 65rb" dengan maskot, tombol "Mulai". Isi data seed (kategori, template).

### 10.3 Beranda (F2, F3, F4, F8)
Urutan vertikal (lebar acuan 390px; padding horizontal 20px):

1. **Header** (tinggi 64): koin maskot 32px + wordmark "Tanggal Tua" (800, 18px) di kiri; tombol ikon pengaturan 44×44 di kanan.
2. **Hero card** (radius 28, padding 22; jarak atas 16):
   - Baris atas: label "Jatah hari ini" (14/600) di kiri; chip "Kiriman 1 Des · 13 hari lagi" (12/700, latar putih 16%) di kanan. Pada state `tanggal-tua`: label diganti badge kuning "Mode Tanggal Tua" dan chip jadi "1 Des · 4 hari lagi".
   - Angka besar: sisa jatah, contoh "Rp 36rb" (52–56px, bobot 800, letter-spacing −2px, line-height 1.08, angka proporsional).
   - Sub: "dari jatah Rp 65rb · terpakai Rp 29rb" (14/500).
   - Baris Sisa uang: label "Sisa uang" (13/700, `--hero-muted`, kontras ≥4.5:1 di semua tema/state) dan nilai `currentBalance` dengan `formatFull` (14/800, contoh "Sisa uang Rp 845.000", negatif "−Rp 20.000" U+2212). Dibaca screen reader sebagai satu kalimat ("Sisa uang 845 ribu rupiah"). Tampil di state `normal`, `fresh`, `tanggal-tua`, `over`, `broke` (pada `payday-needed` saldo sudah tampil sebagai angka utama).
   - Progress bar 10px (radius 5): isi = `usedRatio`, warna koin; `role="img"` + `aria-label` ("Terpakai 45 persen dari jatah harian").
   - Bubble maskot (padding 12, radius 18): maskot 40px + satu kalimat (14/600) sesuai state (bagian 12).
3. **Catat cepat**: label (13/700, muted) lalu baris chip template (tinggi 44, radius 22) + tombol "+" bergaris putus (44×44).
4. **"Hari ini"**: judul (16/800) + tautan "Lihat semua" (target sentuh tinggi ≥44px). Daftar maksimal 3 transaksi terbaru hari ini dalam kartu putih (radius 24). Baris tinggi 60: ikon kategori bulat 40px berwarna nada kategori, nama (15/700), sub "Kategori · jam" (12/500, muted), nominal rata kanan (15/800, "−15rb").
5. **Dock input** (tinggi 56, radius 28, border): `<label>` tersembunyi + `<input>` (placeholder "Ketik: kopi 18rb"), tombol mic 44px (hanya bila Web Speech didukung dan fitur P2 aktif), tombol kirim 44px bulat (warna primer).
6. **Navigasi bawah** (tinggi 64; item aktif dengan pil 52×28 berwarna `--primary-tint`).

Ruang sisa di antara daftar dan dock memakai `flex: 1`; tinggi total layar harus muat di 390×844 tanpa terpotong pada state normal. Pada layar lebih tinggi/pendek, konten boleh di-scroll; dock dan navigasi tetap menempel di bawah.

### 10.4 Form transaksi (F5)
Bottom sheet: segmented control Pengeluaran/Pemasukan, nominal (keypad numerik, tampilan "Rp 18.000" live), kategori (grid ikon), catatan (maks 80), tanggal (default hari ini; min `openingDate`; maks hari ini). Mode ubah menampilkan tombol "Hapus" (dengan undo). Validasi sesuai 5.4.

### 10.5 Riwayat (F6)
Header sticky dengan filter jenis (Semua/Keluar/Masuk) dan dukungan filter query `?kategori=<id>&dari=<start>&sampai=<end>` yang ditampilkan sebagai chip yang bisa dihapus ("Makan · 10–16 Nov ×"). Daftar dikelompokkan per hari ("Hari ini", "Kemarin", "Sel, 10 Nov"), tiap grup menampilkan total keluar hari itu. Ketuk baris → sheet ubah. Geser/aksi hapus dengan toast Batalkan. State kosong dengan maskot.

### 10.5.1 Ringkasan (F11 · 0.3.0)
Rute `/ringkasan?periode=minggu|bulan&tanggal=YYYY-MM-DD` (lazy-loaded):
- Header: segmented control "Minggu | Bulan", tombol `‹` dan `›` (≥44px) dengan label periode di tengah. `›` nonaktif di periode sekarang; `‹` nonaktif bila periode sebelumnya seluruhnya sebelum `openingDate`.
- Kartu angka: Total keluar (besar), Total masuk, Selisih (`masuk − keluar`), Rata-rata keluar per hari (`floor(totalExpense / daysCounted)`), serta kalimat perbandingan adil terhadap periode lalu (tanpa merah/hijau dan tanpa kata menghakimi). Transaksi bertipe `adjustment` dikecualikan.
- Chart A (Donut SVG `stroke-dasharray`): pengeluaran per kategori dengan jarak 2px berwarna `--surface`, total keluar di tengah, `role="img"` dengan `aria-label` ringkasan, dan legenda di bawahnya (titik `--chart-1..9`, ikon+nama, nominal pendek, persen metode largest remainder berjumlah tepat 100). Mengetuk baris legenda membuka `/riwayat?kategori=<id>&dari=<start>&sampai=<end>`.
- Chart B (Batang HTML/flex `<button>`): pengeluaran per hari (7 batang Sen–Min untuk minggu; seluruh hari dengan label di 1, 5, 10, 15, 20, 25, 30 untuk bulan). Mengetuk/memfokus batang menampilkan keterangan tanggal & nominal di bawah chart; dilengkapi tabel `sr-only`.
- State memuat/kosong/error terpisah; kosong menampilkan maskot Receh + "Belum ada catatan di periode ini. Yuk catat dulu.". Bila hanya ada pemasukan, area chart kategori menampilkan "Belum ada pengeluaran".

### 10.6 Pengaturan (F7)
Bagian: **Tampilan** (tema), **Kiriman** (kontrol `Ulangi`: `Tidak | Tiap minggu | Tiap bulan`; pemilih tanggal untuk `Tidak`/`Tiap bulan`, atau 7 chip hari + pratinjau otomatis untuk `Tiap minggu`, tersimpan lewat update parsial dengan penanda sinkron terhadap `settings`), **Saldo** (koreksi saldo → membuat `adjustment`), **Template** (tambah/ubah/hapus/urutkan), **Data** (Export JSON, Export CSV, Import, Hapus semua data dengan konfirmasi dua langkah), **Tentang** (versi, ringkasan privasi: "Datamu hanya ada di perangkat ini").

### 10.7 Patungan (P1)
Daftar orang dengan saldo bersih (siapa utang ke siapa), tombol "Tambah utang", tandai lunas, bagi tagihan rata ("Total 120rb, 4 orang → 30rb per orang", lalu buat catatan utang untuk yang lain). Transaksi patungan milikmu tetap tercatat sebagai pengeluaran biasa sebesar bagianmu.

---

## 11. Design system

Karakter visual: **tenang di struktur, hangat di detail, premium di material, lokal di bahasa.**

### 11.1 Token warna (`src/styles/tokens.css`)
```css
:root {
  --bg:#FAF5EC;  --surface:#FFFFFF;  --border:#E6DCCB;  --border-soft:#F1E9DA;
  --ink:#231C16; --muted:#6B5E52;
  --primary:#2B3A8C; --primary-tint:#E3E7FB; --on-primary:#FFFFFF;
  --coin:#F2B33D; --coin-edge:#C98A1B;
  --warm:#9E3F27;               /* state tanggal-tua dan over */
  --hero-bg:var(--primary);     --hero-ink:#FFFFFF; --hero-muted:rgba(255,255,255,.85);
  --hero-track:rgba(255,255,255,.22); --hero-chip:rgba(255,255,255,.16);

  /* token chart kategori (>= 3:1 vs --surface, kecerahan berdekatan berbeda):
     --chart-1..--chart-9 di light (#2B3A8C, #B4690E, #1D5C3A, #C24E32, #52328C, #0F7A8A, #7E263D, #6E7216, #4A4540)
     dan dark (#A9B4FF, #D98E2B, #7CE0A3, #E07052, #CEB5FF, #4AB2C4, #FFA3BA, #A69B2E, #CBC0B2) */

  /* nada kategori: --tone-<nama>-bg / --tone-<nama>-ink */
  --tone-makan-bg:#FDE7C2;     --tone-makan-ink:#7A4300;
  --tone-transport-bg:#DDE2FA; --tone-transport-ink:#2B3A8C;
  --tone-jajan-bg:#EAD9C8;     --tone-jajan-ink:#5A3A24;
  --tone-kosan-bg:#D9EBDD;     --tone-kosan-ink:#1F5A36;
  --tone-paketan-bg:#E6DDF5;   --tone-paketan-ink:#4B2E83;
  --tone-kuliah-bg:#D8EEF2;    --tone-kuliah-ink:#17566B;
  --tone-belanja-bg:#F6DADA;   --tone-belanja-ink:#8A2F2F;
  --tone-hiburan-bg:#FBE3EE;   --tone-hiburan-ink:#8A2A5B;
  --tone-lainnya-bg:#ECE6DC;   --tone-lainnya-ink:#5B5146;
}
[data-theme="dark"] {
  --bg:#14110E; --surface:#1E1A16; --border:#2E2822; --border-soft:#2A241E;
  --ink:#F6EFE4; --muted:#B8AB9B;
  --primary:#A9B4FF; --primary-tint:#262C5E; --on-primary:#14110E;
  --coin:#F5C04D;
  --hero-bg:rgba(154,167,255,.14); /* + border rgba(169,180,255,.28), backdrop-filter: blur(24px) */
  --hero-track:rgba(255,255,255,.18); --hero-chip:rgba(255,255,255,.12);
  --tone-makan-bg:#3B2A12;     --tone-makan-ink:#F5C04D;
  --tone-transport-bg:#262C5E; --tone-transport-ink:#A9B4FF;
  --tone-jajan-bg:#3A2B20;     --tone-jajan-ink:#E3C2A0;
  /* nada lain: bg = warna ink-terang pada opasitas ±18% di atas --surface, ink = versi terang; WAJIB lolos kontras 4.5:1 */
}
```
- Tema mengikuti `prefers-color-scheme` bila pengaturan `system`; atribut `data-theme` dipasang sedini mungkin (skrip inline di `index.html`) untuk mencegah kilatan tema.
- Pada dark mode, hero memakai permukaan "kaca" di atas blob dekoratif lembut (`#4A5BD0`, opasitas .45, blur 60px) yang diberi `aria-hidden`.
- State `tanggal-tua` dan `over`: `--hero-bg: var(--warm)`; di dark mode gunakan `#C8573A` bila kontras teks putih ≥ 4.5:1, kalau tidak turunkan kecerahannya.

### 11.2 Tipografi
Font tunggal: **Plus Jakarta Sans** (self-host). Skala:

| Peran | Ukuran / bobot | Catatan |
|---|---|---|
| Display (angka hero) | 56 / 800, line-height 1.1, letter-spacing −2px | `font-variant-numeric: tabular-nums` |
| Judul app | 18 / 800, letter-spacing −0.3px | |
| Heading seksi | 16 / 800 | |
| Isi / nama transaksi | 15 / 700 | |
| Teks sekunder | 14 / 500–600 | |
| Label | 13 / 700 | |
| Caption | 12 / 500 | |
| Nav | 11 / 700 (aktif 800) | |

### 11.3 Bentuk, jarak, target sentuh
- Padding halaman 20px; jarak antar-blok 12–20px; gap kecil 8, sedang 12, besar 16.
- Radius: hero 28, kartu daftar 24, dock 28, chip/tombol bulat 22, ikon kategori 20 (lingkaran 40px), progress 5.
- **Semua target sentuh ≥ 44×44px.**
- Lebar konten maks 480px dan terpusat pada layar lebar.

### 11.4 Komponen inti
`Button` (primer, sekunder, ghost), `Chip` (template), `Card`, `Sheet`, `Toast` (dengan aksi), `ProgressBar`, `Switch`, `SegmentedControl`, `EmptyState`, `TransactionRow`, `CategoryIcon`, `Mascot`, `BottomNav`. Gunakan elemen semantik asli (`<button>`, `<a>`, `<input>` + `<label>`), jangan `div` dengan `onClick`.

### 11.5 Maskot "Receh" (koin)
Lingkaran koin kuning dengan cincin dalam, dua mata titik, pipi merah muda tipis. Ekspresi mulut: `smile` (normal/fresh), `flat` (tanggal-tua), `oops` (over), `sleepy` (broke). Dekoratif → `aria-hidden="true"`. Dasar SVG (viewBox 48):
```svg
<svg viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="24" cy="24" r="22" fill="var(--coin)"/>
  <circle cx="24" cy="24" r="17" fill="none" stroke="var(--coin-edge)" stroke-width="2"/>
  <circle cx="18" cy="21" r="2.2" fill="#231C16"/><circle cx="30" cy="21" r="2.2" fill="#231C16"/>
  <!-- mulut smile -->
  <path d="M17 28c2 3.2 12 3.2 14 0" fill="none" stroke="#231C16" stroke-width="2.2" stroke-linecap="round"/>
  <!-- mulut flat (ganti path di atas): M18 29h12 -->
  <circle cx="14" cy="27" r="2.4" fill="#E8896B" opacity=".7"/><circle cx="34" cy="27" r="2.4" fill="#E8896B" opacity=".7"/>
</svg>
```

### 11.6 Gerak
- Angka hero berubah dengan count-up ±400ms ease-out; progress bar bertransisi lebar 300ms.
- Toast masuk dari bawah (200ms); sheet naik (250ms).
- Hormati `prefers-reduced-motion`: matikan count-up dan transisi non-esensial.
- Ikon kecil dan maskot boleh berkedip halus (opsional), tidak boleh mengganggu.

### 11.7 Aksesibilitas visual
- Kontras teks ≥ 4.5:1 (teks besar ≥ 3:1), termasuk label kecil 11–12px dan teks di atas hero. Buat skrip/test kontras untuk pasangan token.
- Warna tidak jadi satu-satunya pembeda: status juga dibedakan lewat teks/ikon.
- Fokus keyboard terlihat jelas (outline 2px `--primary`).

---

## 12. Copywriting (Bahasa Indonesia santai)

**Nada:** hangat, singkat, tidak menggurui, tidak menghakimi. Pakai "kamu". Hindari kata "boros", "bokek", "gagal", "salah".

**Pesan maskot per state (pilih deterministik per hari agar tidak berubah-ubah saat dibuka ulang):**
| State | Contoh pesan |
|---|---|
| `normal` | "Masih aman. Satu kopi lagi masih boleh." · "Santai, jatah hari ini masih longgar." · "Pelan-pelan aja, kamu di jalur." |
| `fresh` | "Hari baru, jatah penuh. Yuk jajan seperlunya." |
| `tanggal-tua` | "Tanggal tua nih. Tarik napas, kita atur bareng." · "Sisa dikit, tapi masih cukup kalau dipilih-pilih." |
| `over` | "Hari ini lewat Rp {n}. Tenang, jatah besok kita sesuaikan." |
| `broke` | "Dompet lagi kosong. Kita cari jalan pelan-pelan." |
| `payday-needed` | "Kiriman udah masuk? Catat dulu biar jatahnya akurat." |

**String umum:** "Jatah hari ini", "Catat cepat", "Hari ini", "Lihat semua", "Ketik: kopi 18rb", "Tersimpan · {catatan} −{nominal}", "Batalkan", "Belum ada catatan hari ini. Yuk catat yang pertama.", "Datamu hanya ada di perangkat ini.", "Hapus semua data? Ini tidak bisa dibatalkan."

**Pesan error parser (hint):** NO_AMOUNT "Tambah nominal, mis. 10rb" · MULTIPLE_AMOUNTS "Catat satu per satu dulu ya" · OUT_OF_RANGE "Nominalnya di luar batas wajar" · INVALID_AMOUNT "Nominalnya belum terbaca".

---

## 13. PWA dan offline (F9)

- `vite-plugin-pwa` dengan strategi `generateSW`/`injectManifest`; **precache seluruh app shell, font, dan ikon**. Tidak ada aset yang dimuat dari CDN saat runtime.
- Manifest:
```json
{
  "name": "Tanggal Tua",
  "short_name": "Tanggal Tua",
  "description": "Catat uang jajan, tahu sisa jatah hari ini.",
  "lang": "id",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#FAF5EC",
  "theme_color": "#2B3A8C",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- Tambahkan `apple-touch-icon` dan meta iOS standalone. Ikon aplikasi = koin maskot di atas latar solid.
- **Pembaruan:** saat versi baru tersedia, tampilkan toast "Versi baru tersedia · Muat ulang"; jangan memuat ulang paksa saat pengguna sedang mengetik.
- **Persistensi data:** panggil `navigator.storage.persist()` setelah transaksi pertama (jika didukung). Browser tetap dapat menghapus data situs; karena itu sediakan Export dan (P1) pengingat backup.
- Aplikasi harus **bisa dipakai penuh dalam mode pesawat** setelah kunjungan pertama.

---

## 14. Privasi, keamanan, dan backup

- Tidak ada pengiriman data ke server. Tidak ada analytics, pelacak, atau iklan.
- Terapkan Content Security Policy ketat (hanya `self`; tanpa skrip/gaya inline kecuali skrip tema yang diberi hash/nonce).
- Export JSON/CSV berisi data apa adanya (tidak terenkripsi); tampilkan peringatan singkat sebelum export.
- "Hapus semua data" menghapus seluruh tabel Dexie, cache service worker data (bila ada), dan mengembalikan ke onboarding.
- Sanitasi semua teks pengguna saat dirender (React sudah meng-escape; jangan memakai `dangerouslySetInnerHTML`).
- Import dari file: validasi ketat dengan Zod, batasi ukuran file (mis. 10 MB), jangan eksekusi apa pun dari isi file.

---

## 15. Aksesibilitas dan performa

**Aksesibilitas (target WCAG 2.2 AA)**
- Elemen semantik; label untuk semua input; `aria-label` untuk tombol ikon; ikon dekoratif `aria-hidden`.
- Navigasi penuh dengan keyboard; fokus dikelola saat sheet/toast muncul (kembalikan fokus saat ditutup).
- Toast memakai `role="status"` (tidak merebut fokus), kecuali error penting (`role="alert"`).
- `lang="id"` pada `<html>`.
- Dukungan zoom teks 200% tanpa kehilangan fungsi.

**Performa (target, ukur dengan Lighthouse mobile)**
- Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, PWA installable.
- JS awal ≤ ~150 KB gzip; pecah kode per rute (`React.lazy`) untuk Riwayat, Pengaturan, dan P1.
- Interaksi mencatat: simpan dan tampilkan hasil < 100 ms terasa instan (optimistic UI).
- Hindari layout shift (font-display: swap + ukuran tetap untuk hero).

---

## 16. Testing dan acceptance

### 16.1 Unit test (Vitest) — wajib
- `allowance.test.ts`: semua kasus di tabel 5.2 + tepi (daysLeft=1, `paydayDay`=31 di bulan 30 hari, lintas tahun).
- `getHomeState` untuk semua state di 5.3 dan urutan prioritasnya.
- `money.test.ts`: `formatShort` (750, 1000, 1500, 36000, 36500, 1500000, 2000000, negatif) dan `formatFull`.
- `parseQuickAdd.test.ts`: seluruh tabel 6.5.
- `exportImport.test.ts`: round-trip JSON, import rusak tidak mengubah data, CSV BOM.

### 16.2 Komponen (Testing Library)
Hero card per state; QuickAddBar (sukses, error hint); TransactionSheet (validasi); Toast Batalkan.

### 16.3 E2E (Playwright)
1. Onboarding → melihat jatah harian awal.
2. Quick-add "kopi 18rb" → sisa jatah turun 18rb → Batalkan → kembali.
3. Tap template → tersimpan → muncul di "Hari ini".
4. Ubah dan hapus transaksi dari Riwayat.
5. Ganti tema; tema bertahan setelah reload.
6. **Offline:** setelah kunjungan pertama, set offline → semua alur 2–4 tetap jalan.
7. Export JSON → Hapus semua → Import → data kembali.
8. Simulasi pergantian hari (mock clock) → jatah dihitung ulang.

### 16.4 Acceptance checklist akhir MVP
- [ ] Semua unit/komponen/e2e lulus; `tsc --noEmit`, ESLint, Prettier bersih.
- [ ] Lighthouse sesuai target (bagian 15) pada build produksi.
- [ ] Berfungsi penuh offline dan bisa diinstal (Android Chrome; uji juga iOS Safari "Tambah ke Layar Utama").
- [ ] Kontras diuji untuk tema terang, gelap, dan state tanggal-tua.
- [ ] Tidak ada permintaan jaringan pihak ketiga saat runtime (cek tab Network).
- [ ] Semua teks UI Bahasa Indonesia sesuai panduan nada.
- [ ] README lengkap (bagian 18.2) dan `docs/CASE-STUDY.md` terisi.
- [ ] Repository memenuhi checklist bagian 21.8.

---

## 17. Roadmap milestone

| # | Milestone | Isi | Definition of Done |
|---|---|---|---|
| M0 | Fondasi | Vite+React+TS strict, Tailwind, token CSS, font self-host, ESLint/Prettier, Vitest, struktur folder, berkas repo (bagian 21.1–21.2), CI (lint+typecheck+test+build) | `pnpm dev/build/test/lint` jalan; halaman kosong memakai token dan font |
| M1 | Domain | `money`, `dates`, `allowance`, `getHomeState`, `parseQuickAdd` + test lengkap | Semua test bagian 16.1 hijau; tanpa UI |
| M2 | Data | Dexie schema, seed, repositories, export/import (JSON+CSV) + test | Round-trip lulus; migrasi v1 terdokumentasi |
| M3 | Beranda + catat | AppShell, BottomNav, Hero (semua state), QuickChips, TodayList, QuickAddBar, Toast Batalkan | F2, F3, F4, F8 terpenuhi; tampilan sesuai 10.3 dan bagian 11 |
| M4 | Onboarding + form | Onboarding 3 layar, TransactionSheet (tambah/ubah/hapus) | F1, F5 terpenuhi |
| M5 | Riwayat + Pengaturan | Riwayat per hari + filter; Pengaturan lengkap (tema, kiriman, koreksi saldo, template, data) | F6, F7, F10 terpenuhi |
| M6 | PWA + offline | Manifest, service worker, ikon, prompt update, persist storage | F9 terpenuhi; e2e offline lulus |
| M7 | Polish + kualitas | Gerak, state kosong, aksesibilitas, kontras, performa, e2e penuh, README, case study, kesiapan repo (bagian 21), tag rilis `v1.0.0` | Acceptance checklist 16.4 selesai → **MVP rilis** |
| M8 | P1 | Patungan/utang, transaksi berulang, kategori kustom, pencarian, ringkasan bulanan, streak, insight aturan, pengingat backup, layout desktop | Per fitur: unit test + e2e + update dokumen |
| M9 | P2 (opsional) | Suara, dashboard modular, sync terenkripsi, insight AI | Sesuai keputusan pemilik |

---

## 18. Konvensi, deployment, dokumentasi

### 18.1 Konvensi kode
- TypeScript `strict`; tidak ada `any` tanpa komentar alasan.
- Penamaan: komponen `PascalCase`, fungsi/variabel `camelCase`, file domain `camelCase.ts`, file komponen `PascalCase.tsx`.
- Fungsi `domain` murni dan deterministik (terima `today` sebagai argumen, jangan memanggil `new Date()` di dalamnya).
- Commit memakai **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), satu commit atau lebih per milestone, pesan dalam bahasa Inggris.
- Tidak ada `console.log` tersisa di build produksi.

### 18.2 README minimum
Judul, tagline, tangkapan layar (terang/gelap/tanggal tua), fitur, cara menjalankan (`pnpm i`, `pnpm dev`, `pnpm test`, `pnpm build`), arsitektur singkat (diagram folder + aliran dependensi), keputusan penting (local-first, parser, rumus jatah), batasan yang diketahui, roadmap, lisensi.

### 18.3 Kerangka `docs/CASE-STUDY.md` (untuk portofolio)
1. Masalah dan pengguna (mahasiswa, pertanyaan "boleh jajan berapa hari ini").
2. Riset pesaing dan celah (bagian 2).
3. Keputusan produk (satu angka, catat 5 detik, local-first) dan hal yang sengaja tidak dibuat.
4. Desain (tenang/hangat/premium/lokal, maskot, token, aksesibilitas).
5. Teknis (rumus jatah, parser, data lokal, PWA offline) dan tantangan.
6. Hasil (skor Lighthouse, cakupan test) dan pembelajaran.
7. Langkah berikutnya (P1/P2).

### 18.4 Deployment
Build statis (`pnpm build`) ke satu layanan hosting statis dengan HTTPS (wajib untuk service worker), fallback SPA ke `index.html`, header cache: aset ber-hash `immutable`, `index.html` dan service worker `no-cache`.

---

## 19. Keputusan default dan pertanyaan terbuka

**Keputusan default (agent boleh langsung memakai; catat di `docs/DECISIONS.md`)**
| Topik | Default |
|---|---|
| Nama aplikasi | "Tanggal Tua" lewat konstanta `APP_NAME`; mudah diganti |
| Stack | Bagian 8 |
| Tema awal | Sistem |
| Threshold mode tanggal tua | Rp 30.000 atau sisa ≤ 20% jatah |
| Batas nominal | 1 – 1.000.000.000 |
| Tanggal transaksi | Tidak boleh masa depan; minimal `openingDate` |
| Hapus transaksi | Hapus keras dengan undo 5 detik |
| Jumlah chip template di Beranda | 3 + tombol "+" |
| Beberapa nominal dalam satu input | Ditolak di MVP (`MULTIPLE_AMOUNTS`) |
| Lisensi | MIT (ubah bila pemilik meminta lain) |

**Pertanyaan untuk pemilik project (ajukan di akhir milestone terkait, jangan menghentikan pekerjaan):**
1. Nama final dan ketersediaan domain/merek? (sebelum M7)
2. Platform hosting yang dipilih? (sebelum M6)
3. Apakah ingin ikon dan maskot dibuat ulang oleh desainer, atau tetap memakai SVG koin di dokumen ini? (sebelum M6)
4. Apakah P1 "Patungan" dikerjakan setelah MVP rilis, atau ada prioritas P1 lain? (setelah M7)

---

## 20. Referensi riset

- Daftar aplikasi pencatat pengeluaran 2026: TechRadar, NerdWallet, The Penny Hoarder, Expensify (blog).
- Celah aplikasi keuangan pribadi 2026 (privasi, offline, multi-mata-uang, friksi input): Finny, "What Personal Finance Apps Are Missing in 2026".
- Aplikasi pencatat keuangan Indonesia 2026: Popbela, Dealls, romisaputra.com, jurnal.id.
- Tren desain fintech dan mobile 2026: Kindgeek, Veza Digital, OneThing Design, Yellow Slice, Design Studio UIUX, Finny (aesthetic budget apps).
- Referensi visual (opsional): mockup kanvas "Tanggal Tua – Layar Utama" (tiga layar: terang, gelap, mode tanggal tua). Jika ada perbedaan antara mockup dan dokumen ini, **dokumen ini yang berlaku**.

---

## 21. Kesiapan repository GitHub (agar tampil profesional)

Tujuan: orang yang membuka repo (rekruter, dosen, sesama developer) paham proyeknya dalam 30 detik dan percaya kualitasnya dalam 3 menit.

### 21.1 Berkas wajib di root
| Berkas | Isi |
|---|---|
| `README.md` | Sesuai 18.2, ditambah elemen visual di 21.4. |
| `LICENSE` | MIT, atas nama pemilik project, tahun 2026 (ganti bila pemilik meminta lain). |
| `.gitignore` | `node_modules`, `dist`, `dev-dist`, `coverage`, `playwright-report`, `test-results`, `.env*`, `.DS_Store`, log editor. |
| `.editorconfig` | UTF-8, LF, indentasi 2 spasi, newline di akhir berkas. |
| `.nvmrc` + `engines` di `package.json` | Versi Node LTS yang dipakai. |
| `pnpm-lock.yaml` | Di-commit. |
| `CHANGELOG.md` | Format Keep a Changelog; entri per rilis (mulai `1.0.0`). |
| `CONTRIBUTING.md` | Singkat: cara menjalankan, aturan commit (18.1), cara menjalankan test. |
| `SECURITY.md` | Singkat: cara melaporkan masalah keamanan; jelaskan bahwa aplikasi local-first tanpa server. |

Skrip standar di `package.json`: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `test:e2e`.

### 21.2 Folder `.github/`
- `workflows/ci.yml`: berjalan pada push ke `main` dan setiap pull request; langkah: pasang pnpm + Node (dengan cache), `pnpm i --frozen-lockfile`, `lint`, `typecheck`, `test`, `build`; job terpisah untuk e2e Playwright. Seluruh job harus hijau.
- `pull_request_template.md`: ringkasan perubahan, milestone/fitur terkait, checklist (test lulus, dokumen diperbarui, tidak ada `console.log`).
- `ISSUE_TEMPLATE/bug_report.yml` dan `feature_request.yml` (issue forms).
- `dependabot.yml`: pembaruan mingguan untuk npm dan GitHub Actions.

### 21.3 Demo langsung
- Deploy ke hosting statis (18.4) dan pasang URL-nya di README (bagian atas) serta di kolom "Website" repo.
- Pastikan demo bisa diinstal sebagai PWA dan berfungsi offline.
- Badge di README (maksimal 4): status CI, lisensi, versi rilis, tautan demo.

### 21.4 README yang menjual
Urutan: judul + tagline → badge → satu paragraf "mengapa dibuat" (masalah, pertanyaan "boleh jajan berapa hari ini") → GIF demo → tangkapan layar → fitur → cara menjalankan → arsitektur → keputusan teknis → roadmap → lisensi.
- **GIF/video pendek ≤ 10 detik**: ketik "kopi 18rb" → jatah turun → Batalkan.
- **Tangkapan layar** terang, gelap, dan mode tanggal tua di `docs/screenshots/` (lebar 390px, data contoh fiktif).
- Diagram singkat aliran dependensi (domain → data → UI) memakai Mermaid atau gambar.
- Tidak ada placeholder, TODO, atau tautan rusak.

### 21.5 Pengaturan repo di GitHub (dikerjakan manual oleh pemilik)
- **Nama repo:** `tanggal-tua`. **Description** satu kalimat + isi kolom Website dengan URL demo.
- **Topics:** `pwa`, `react`, `typescript`, `vite`, `indexeddb`, `dexie`, `personal-finance`, `expense-tracker`, `local-first`, `indonesia`.
- **Social preview image** 1280×640 (koin maskot + nama + tagline).
- Aktifkan Issues; nonaktifkan Wiki dan Projects bila tidak dipakai.
- Pin repo di profil.
- Branch protection untuk `main` (opsional tapi disarankan): wajib CI hijau sebelum merge.
- **Releases:** buat tag `v1.0.0` dengan catatan rilis ringkas saat MVP selesai.

### 21.6 Riwayat commit dan branch
- Conventional Commits (18.1); commit kecil dan bermakna, bukan satu commit raksasa.
- Branch `main` stabil; kerjakan lewat `feat/*`, `fix/*`, `docs/*` dan merge lewat pull request (squash) walau dikerjakan sendiri, agar riwayat rapi.
- Versi mengikuti Semantic Versioning.

### 21.7 Sinyal kualitas yang terlihat
Nol warning TypeScript/ESLint, CI hijau, test tersedia dan terjalankan otomatis, struktur folder konsisten dengan bagian 9, dependency minimal, dan `docs/DECISIONS.md` menunjukkan alasan di balik keputusan.

### 21.8 Checklist sebelum repo dibuat publik
- [ ] Tidak ada secret, token, atau data pribadi di kode, fixtures, tangkapan layar, maupun riwayat git (periksa dengan alat pemindai seperti gitleaks atau manual).
- [ ] Clone baru: `pnpm i && pnpm build && pnpm test` berhasil tanpa langkah tambahan.
- [ ] README bebas placeholder; semua tautan dan gambar tampil.
- [ ] LICENSE, CHANGELOG, dan berkas di 21.1 lengkap.
- [ ] CI hijau di `main`; demo live berfungsi dan bisa diinstal.
- [ ] Topics, description, website, dan social preview sudah diatur.
