# Studi Kasus Portofolio: Tanggal Tua

## 1. Masalah dan Pengguna

Bagi banyak mahasiswa dan pekerja muda (Gen Z) di Indonesia yang hidup dari kiriman berkala atau gaji awal karier, pertanyaan finansial paling mendesak setiap hari bukanlah *"Bagaimana rasio alokasi pengeluaran bulananku?"*, melainkan:

> *"Hari ini aku masih boleh jajan berapa?"*

Mayoritas aplikasi pencatat keuangan sulit bertahan lama dipakai setiap hari karena tiga hambatan:
1. Mencatat transaksi terasa seperti pekerjaan pembukuan dengan terlalu banyak formulir dan ketukan layar.
2. Layar utama menampilkan rekap historis, bukan angka keputusan yang jelas untuk hari ini.
3. Kewajiban membuat akun dan bergantung pada server membuat aplikasi rentan gagal saat sinyal lemah sekaligus menimbulkan kekhawatiran privasi.

## 2. Riset Pesaing dan Celah Pasar

Aplikasi manajemen keuangan populer di pasaran umumnya mengejar kelengkapan akuntansi multi-dompet atau sinkronisasi rekening. **Tanggal Tua** sengaja mengambil ceruk yang lebih tajam:
- **Satu angka keputusan:** Menghitung sisa jatah harian secara dinamis dari saldo aktif dibagi sisa hari menuju tanggal kiriman berikutnya.
- **Catat cepat 5 detik berbahasa chat:** Memahami ketikan natural Indonesia (`kopi 18rb`, `makan siang 15k`, `transfer dari ortu 1jt`, `+500rb freelance`) sekaligus tombol satu ketuk chip template dan penanda tanpa pengeluaran.
- **100% Local-First & Offline:** Seluruh data disimpan di IndexedDB pengguna tanpa backend, akun, atau panggilan jaringan eksternal apa pun.

## 3. Keputusan Produk dan Hal yang Sengaja Tidak Dibangun

**Pilar utama rilis 1.0.0:**
1. **Stabilitas jatah harian:** Plafon hari ini (`dailyAllowance = floor((currentBalance + spentToday) / daysLeft)`) tetap konsisten sepanjang hari agar pengguna mendapat batas harian yang jelas, sementara sisa lebih atau minus hari ini otomatis menyesuaikan jatah mulai besok.
2. **Nada tenang tanpa rasa bersalah:** Saat saldo menipis atau anggaran kategori lewat batas, antarmuka memakai warna terakota hangat (`--warm` / `--warm-ink`) dan pesan suportif dari maskot Receh alih-alih indikator merah/hijau yang menghakimi.
3. **Tabungan terpisah dari belanja:** Transaksi setoran atau penarikan target tabungan (`goalId`) memakai kategori sistem khusus agar memengaruhi saldo bebas (`currentBalance`) tanpa mengotori `spentToday` maupun grafik belanja di Ringkasan.
4. **Banner Beranda tunggal berbasis prioritas:** Hanya satu banner konteks yang boleh tampil di Beranda pada satu waktu (`kiriman > pengingat harian > anggaran > panduan iOS > cadangan`) agar fokus angka utama tetap bersih pada layar ponsel `390x844`.
5. **Pengingat tanpa server maupun paksaan izin:** Pengingat bekerja secara pasif di dalam app serta lewat unduhan standar kalender lokal `.ics`, alih-alih memakai Push Notification, Periodic Sync, atau Notification Triggers yang membutuhkan server atau dukungan browser terbatas.

**Hal yang sengaja tidak dibangun:** sinkronisasi bank/SMS otomatis, multi-dompet, penguncian app, patungan/utang, transaksi berulang otomatis, kategori kustom, laporan PDF, dan input suara (ditunda karena membutuhkan keputusan privasi mode lokal dan parser angka lisan Indonesia).

## 4. Desain dan Aksesibilitas

- **Palet Warna Terverifikasi Matematis:** Seluruh token pada `:root` (terang) dan `[data-theme="dark"]` (gelap, hero kaca dengan backdrop blur) diverifikasi lewat `src/styles/contrast.test.ts` yang membaca langsung `src/styles/tokens.css`: teks normal `>= 4.5:1`, batas kontrol/progress/chart `>= 3.0:1`, dan perbedaan luminansi bertetangga pada `--chart-1..9`.
- **Maskot "Receh":** SVG koin ringan dengan 6 ekspresi (`smile`, `flat`, `oops`, `sleepy`, `cheer`, `wink`), ucapan deterministik harian, serta dukungan penuh `prefers-reduced-motion`.
- **Standar WCAG 2.2 AA:** Elemen semantik asli (`<main>`, `<nav>`, `<dialog>` pada bottom sheet, `<label>` terhubung, `role="switch"`, kontrol disclosure `aria-expanded`), manajemen fokus, `role="status"` untuk toast undo 5 detik, dukungan zoom 200%, serta pemeriksaan otomatis `@axe-core/playwright` pada seluruh 7 rute di tema terang dan gelap.

## 5. Arsitektur Teknis dan Tantangan

Aplikasi dibangun dengan batas ketergantungan searah yang ketat:
- **`src/domain/` (Pure TypeScript):** Seluruh aturan perhitungan jatah, ringkasan, insight berbasis aturan (`R4 -> R1 -> R2 -> R3`), streak, target tabungan, anggaran kalender, prioritas banner, parser teks, dan generator `.ics` berbentuk fungsi murni yang menerima `today` sebagai argumen tanpa menyentuh React maupun Dexie.
- **`src/data/` (Dexie v2 + Zod):** Mengelola skema IndexedDB v2 dengan migrasi atomik tunggal dari v1 (`0.3.x`), validasi skema JSON v1 & v2 via Zod, ekspor CSV bersanitasi formula dengan BOM UTF-8, serta penanganan darurat `AppErrorBoundary` untuk mengekspor cadangan data mentah bila terjadi kegagalan upgrade.
- **`src/features/` & `src/hooks/` (React UI & Resiliensi Browser):** Halaman sekunder dimuat dengan `React.lazy` menjaga JS awal di `141.93 kB` gzip. Visibilitas navigasi bawah pada keyboard mobile diturunkan langsung dari penyusutan `visualViewport` saat ini (bukan state fokus yang bisa tertahan saat gestur Back Android).

## 6. Pengujian, Performa, dan Pembelajaran

- **Audit Build & Lighthouse Mobile (`vite preview`):**
  - JS Awal: **141.93 kB** gzip (batas ~150 kB); lazy chunks 2.03–6.86 kB gzip.
  - Lighthouse Mobile: Performance **98** (`FCP 0.8 s`, `LCP 2.4 s`, `CLS 0.001`, `TBT 80 ms`), Accessibility **100**, Best Practices **100**.
- **Pertahanan Berkelanjutan:**
  - Unit & komponen test (Vitest + Testing Library) mencakup kalkulasi finansial, migrasi v1->v2, kontras semua token warna CSS, snapshot `.ics`, dan interaksi UI.
  - Pengujian E2E (Playwright) memblokir seluruh permintaan ke origin pihak ketiga, menjalankan `@axe-core/playwright` di kedua tema, dan mensimulasikan pembaruan dari data Dexie v1, kegagalan migrasi, pergeseran jam, serta mode offline penuh.

## 7. Langkah Berikutnya

- Fitur pasca-1.0.0 akan mengikuti Semantic Versioning (`MINOR` untuk fitur kompatibel seperti patungan/utang, kategori kustom, atau pencarian riwayat bila disetujui; `PATCH` untuk perbaikan bug) dengan jaminan migrasi aman bagi pengguna dari versi >= 0.3.
