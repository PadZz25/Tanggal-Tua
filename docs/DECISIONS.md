# Catatan Keputusan Proyek (DECISIONS.md)

Dokumen ini mencatat keputusan arsitektur, desain, dan penyempurnaan spesifikasi sepanjang pembangunan aplikasi **Tanggal Tua**.

## 2026-11-18: Keputusan Fondasi & Penyelarasan Antislop (M0)

- **Tanggal:** 2026-11-18
- **Keputusan 1 (Design Read & Dials):**
  `Reading this as: mobile-first personal daily allowance PWA for Indonesian students & Gen Z, in a warm-minimalist tactile financial language, dial ENERGY 2 / RHYTHM 2 / MOTION 2.`
- **Alasan Satu Baris per Keputusan Visual (R-31):**
  - **Warna:** Latar krem hangat (`#FAF5EC`) dan permukaan gelap hangat (`#14110E`) dipadukan dengan indigo (`#2B3A8C`) serta aksen koin (`#F2B33D`) agar aplikasi keuangan terasa tenang dan bersahabat, bukan dingin seperti laporan akuntansi.
  - **Tata letak:** Satu kartu utama sisa jatah harian di bagian teratas layar agar pertanyaan *"Hari ini aku masih boleh jajan berapa?"* terjawab dalam satu detik tanpa menggulir.
  - **Tipografi:** Plus Jakarta Sans dengan `tabular-nums` pada angka jatah 56px dipilih karena keterbacaan angka nominal Rupiah yang tinggi dan karakter geometris yang akrab bagi pengguna muda Indonesia.
  - **Jarak & Ruang:** Padding halaman 20px dan pengelompokan vertikal bertingkat (Hero 28px radius, daftar transaksi 24px radius, dock input 28px radius) memisahkan fokus utama dari aksi pencatatan cepat.
  - **Kartu:** Kartu hanya dipakai untuk membungkus tiga kelompok informasi berbeda (Hero jatah harian, kelompok daftar transaksi harian, dan panel pengaturan) supaya hirarki visual jelas.
  - **Ikon & Ilustrasi:** Maskot koin SVG "Receh" dan ikon kategori `lucide-react` dengan `strokeWidth={2.2}` dipakai agar tebal garisnya selaras dengan garis maskot Receh (`stroke-width="2.2"`) dan hanya memakai objek kategori nyata (makanan, kopi, kendaraan, rumah).
- **Keputusan 2 (Perbaikan Kontras WCAG AA / R-25):**
  - Token `--warm` untuk state `tanggal-tua` dan `over` disesuaikan dari `#A3442B` (light) / `#C8573A` (dark) menjadi `#9E3F27` pada kedua tema agar teks putih di dalam chip `--hero-chip` (`rgba(255,255,255,0.16)`) tetap memenuhi rasio kontras ≥ 4.5:1 (`4.67:1` pada light mode dan `5.10:1` pada dark mode).
  - Menambahkan token `--border-control` (`#8C7D6E` pada light mode = `3.50:1`, `#7A6E62` pada dark mode = `3.60:1`) untuk batas kontrol interaktif (Dock input, tombol `+` bergaris putus, input form, dan Switch) agar memenuhi standar kontras non-teks WCAG 1.4.11 (≥ 3:1).
  - Badge kuning `"Mode Tanggal Tua"` (`--coin: #F2B33D`) ditetapkan selalu menggunakan teks gelap `#231C16` (rasio kontras `10.8:1`).
- **Keputusan 3 (R-37 Konfirmasi Pemilik untuk Hero Dark Mode & Header Beranda):**
  - Atas persetujuan pemilik proyek, Hero Card pada dark mode tetap mempertahankan permukaan kaca (`backdrop-filter: blur(24px)`) di atas blob halus `#4A5BD0` (dibatasi hanya pada 1 elemen Hero sesuai batas dosis `R-10`, dengan kontras teks terjaga ≥ 4.5:1 di seluruh area kartu).
  - Tombol aksi di kanan atas Header Beranda digunakan untuk membuka `TransactionSheet` (form tambah transaksi lengkap), karena menu Pengaturan sudah tersedia secara permanen di `BottomNav`.
- **Keputusan 4 (Gerak Maskot & Ergonomi Keyboard Mobile / R-19, R-39, R-03):**
  - Maskot Receh tidak menggunakan animasi kedip *infinite loop*; reaksi visual hanya berjalan satu kali (*one-shot* ±300ms) saat transaksi disimpan atau state berubah, dan berhenti sepenuhnya saat `prefers-reduced-motion: reduce` aktif.
  - Saat input *Quick-add* sedang fokus di perangkat mobile, `BottomNav` disembunyikan sementara agar *Dock input* dan pesan *hint* tidak tertutup keyboard virtual.
- **Keputusan 5 (Kasus Tepi Parser & Tanggal Minimum):**
  - Kata kunci `masuk` dan `kiriman` hanya diklasifikasikan sebagai `income` apabila tidak berpasangan dengan kata kunci pengeluaran (seperti `tiket`, `tol`, `parkir`, `paket`, `ongkir`).
  - Apabila hasil parse memakai kata `kemarin` pada hari pertama onboarding (`date < openingDate`), transaksi ditolak dengan pesan ramah bahwa saldo awal sudah mencakup kondisi sebelum hari ini.
- **Keputusan 6 (Konvensi Git Commit):**
  - Atas permintaan pemilik proyek, setiap selesai fitur/milestone dilakukan commit Git dengan format *Conventional Commits* berbahasa Indonesia yang alami dan lugas.

## 2026-11-18: Diagnosis & Perbaikan Bug A dan Bug B

- **Tanggal:** 2026-11-18
- **Akar Masalah Bug A (Penanda Tema di Pengaturan):**
  - Kontrol pilihan tema di `SettingsPage.tsx` sebelumnya memakai `role="group"` dengan `aria-pressed` dan memanggil `applyThemeToDocument(theme)` sebelum `updateSettings({ theme })` selesai memperbarui Dexie. Selain itu, warna tombol aktif pada mode gelap (`--primary-tint: #262C5E`) terlalu dekat dengan permukaan kartu (`--surface: #1E1A16`) tanpa ikon penanda.
  - **Solusi:** Menjadikan `settings.theme` (dinormalisasi lewat `normalizeThemePreference`) sebagai satu-satunya sumber kebenaran baik untuk `role="radiogroup"` / `role="radio"` (`aria-checked`) maupun atribut `document.documentElement.dataset.theme`, serta memakai latar kontras `--primary` dan ikon centang pada opsi terpilih.
- **Akar Masalah Bug B (Loading Tanpa Akhir Setelah Refresh):**
  1. `useHomeState.ts` sebelumnya menentukan `isLoading = queryData === undefined && initError === null`. Ketika `useLiveQuery` mengalami penolakan promise atau tertahan karena koneksi IndexedDB yang belum tertutup saat refresh (`versionchange` / `blocked` belum ditangani di `db.ts`), `useLiveQuery` terus mengembalikan `undefined` selamanya tanpa memicu `initError`.
  2. Konfigurasi Workbox sebelumnya mencampur `registerType: 'prompt'` dengan `clientsClaim: true` tanpa `skipWaiting: false` yang eksplisit, serta `dev-sw.js` melakukan `skipWaiting()` tanpa pesan konfirmasi pengguna, sehingga saat refresh di rute pecahan (`React.lazy` seperti `/pengaturan`), siklus hidup Service Worker dan bootstrap DB dapat berbenturan tanpa *ErrorBoundary* atau batas waktu (*timeout*).
  3. `updateSettings` sebelumnya menimpa seluruh baris `db.settings.put(...)` alih-alih melakukan pembaruan parsial `db.settings.update('main', patch)` dan penggabungan default `{ ...DEFAULTS, ...row }` saat pembacaan.
  - **Solusi:** Menambahkan penanganan `db.on('versionchange')` (menutup koneksi lama) dan `db.on('blocked')`, pembaruan parsial `db.settings.update`, fungsi `mergeWithDefaultSettings`, batas waktu bootstrap 5 detik, `AppErrorBoundary` di root, serta layar pemulihan `"Gagal memuat"` dengan tombol `"Muat ulang"` dan `"Reset cache aplikasi"` (menghapus Service Worker & Cache Storage tanpa menyentuh data IndexedDB pengguna).

## 2026-11-18: Kebijakan Versi SemVer 0.2.0 (Tugas 4)

- **Tanggal:** 2026-11-18
- **Keputusan:** Menetapkan versi aplikasi pada `0.2.0` di `package.json` (mencadangkan `1.0.0` untuk rilis final MVP setelah seluruh tahapan selesai).
- **Alasan Pemilihan MINOR (`0.1.0` → `0.2.0`):** Mengikuti aturan SemVer `0.x`, pembaruan ini memuat peningkatan fitur fungsional baru pada domain parser (perluasan kosakata pemasukan kuat/lemah dan aturan prioritas 5 tingkat pada Tugas 1) sekaligus perbaikan Bug A dan Bug B, sehingga dinaikkan pada tingkat MINOR menjadi `0.2.0`.
- **Sumber Tunggal Versi:** `package.json` menjadi satu-satunya sumber kebenaran versi yang disuntikkan saat kompilasi melalui konfigurasi Vite `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` dan ditampilkan secara dinamis pada bagian Pengaturan → Tentang.

## 2026-11-19: Keputusan Rilis 0.3.0 (Sisa Uang, Ringkasan, dan Tipografi Hero)

- **Tanggal:** 2026-11-19
- **Keputusan 1 (Slot Navigasi Bawah ke-4 untuk Ringkasan):**
  - Halaman Ringkasan (`/ringkasan`) menempati slot ke-4 di navigasi bawah (`Beranda`, `Riwayat`, `Ringkasan`, `Pengaturan`). Ketika fitur **Patungan (P1)** dibangun di rilis berikutnya, diperlukan keputusan tata letak navigasi baru (misalnya memindahkan salah satu menu sekunder ke header/tab) karena 5 item di navigasi bawah terlalu padat pada lebar layar 320px–390px.
- **Keputusan 2 (Pengecualian Transaksi `adjustment` dari Ringkasan):**
  - Transaksi bertipe `adjustment` (koreksi saldo) sengaja dikecualikan dari `summarize()` (`totalExpense`, `totalIncome`, `byCategory`, `dailyTotals`) agar angka ringkasan hanya mencerminkan arus pengeluaran dan pemasukan nyata, bukan selisih rekonsiliasi saldo.
- **Keputusan 3 (Perbandingan Adil "Hari yang Sama"):**
  - Saat periode masih berjalan (misalnya hari Rabu pada minggu ini), membandingkan pengeluaran 3 hari berjalan terhadap total 7 hari penuh minggu lalu akan selalu terlihat "turun" dan menyesatkan. Karena itu `comparePeriods()` membandingkan `k` hari pertama periode berjalan dengan `k` hari pertama periode sebelumnya (dijepit ke panjang periode sebelumnya bila lintas panjang bulan, seperti Maret vs Februari).
- **Keputusan 4 (Verifikasi Empiris Celah Koma pada Angka Hero - Tugas 4):**
  - Pengukuran langsung di Chromium pada build produksi (`Plus Jakarta Sans 800`, 52px) membuktikan dua penyebab sekaligus: (1) `font-variant-numeric: tabular-nums` memaksa angka sempit `"1"` melebar dari `19.50px` menjadi `29.22px` (+9.72px) pada `"Rp 1,5jt"`, dan (2) glyph koma `","` bawaan Plus Jakarta Sans 800 memiliki *advance width* `18.08px` dengan *sidebearing* lebar pada kedua mode. Solusi: angka hero menggunakan `font-variant-numeric: proportional-nums` dengan penyesuaian kerning pemisah desimal (`-mx-[0.06em]`), sementara `tabular-nums` tetap dipertahankan pada kolom nominal daftar transaksi, baris Sisa uang, dan legenda Ringkasan.
- **Keputusan 5 (Tidak Menaikkan Versi Skema Dexie):**
  - Seluruh data Ringkasan dan Sisa uang dihitung langsung dari transaksi dan pengaturan yang sudah ada di skema Dexie v1 tanpa menambah tabel atau mengubah skema database.

## 2026-11-21: Keputusan Rilis 0.3.1 (Perbaikan Navigasi Keyboard Mobile & Kiriman Mingguan)

- **Tanggal:** 2026-11-21
- **Akar Masalah Bug Navigasi Bawah Hilang Setelah Mengetuk Input (Terbukti di Build Produksi):**
  - Reproduksi pada build produksi (`vite preview`) memakai Playwright `390×844` -> ketuk input `"Ketik: kopi 18rb"` -> perkecil viewport ke `390×500` (simulasi keyboard) -> kembalikan ke `390×844` tanpa `blur` membuktikan akar masalah #1: `BottomNav.tsx` dan `QuickAddBar.tsx` sebelumnya membaca state lengket `isQuickInputFocused` di Zustand yang diset `true` pada `onFocus` dan hanya dikembalikan ke `false` pada `onBlur`.
  - Ketika keyboard ditutup lewat gestur *Back* sistem di Android PWA standalone, browser mempertahankan fokus DOM pada `<input>` (`document.activeElement.tagName === "INPUT"`) sehingga `blur` tidak pernah terjadi dan `BottomNav` terkunci di luar layar (`translate-y-full`, `top: 844px`) sampai halaman dimuat ulang.
- **Keputusan 1 (Turunkan Visibilitas Navigasi dari Pengukuran `visualViewport` Saat Ini vs Menghapus Penyembunyian):**
  - Daripada menghapus penyembunyian `BottomNav` sepenuhnya saat keyboard tampil, aplikasi mempertahankan penyembunyian **hanya** ketika tinggi `visualViewport` (atau `innerHeight`) benar-benar menyusut > `150px` dari tinggi dasar saat ini (`useViewportKeyboard`). Alasannya: pada layar ponsel `390×844` ketika keyboard lunak (~340px) terbuka menyisakan ~500px, membiarkan `BottomNav` 64px tetap terlihat bersama `QuickAddBar` akan memakan ~30% area layar yang tersisa dan menempatkan tab navigasi tepat di bawah tombol Kirim.
  - Perhitungan ulang dijalankan pada event `visualViewport` (`resize`, `scroll`), `window.resize`, `orientationchange` (reset baseline), `visibilitychange`, `focusin`, `focusout`, dan pergantian rute, disertai penanda `visibility: hidden` (`invisible`) saat tersembunyi agar link navigasi keluar dari tab order tanpa memakai `aria-hidden` pada elemen fokus. Fokus tanpa penyusutan tidak pernah menyembunyikan navigasi, dan mengetuk kirim akan memanggil `blur()` setelah transaksi tersimpan.
  - Meta viewport diperbarui dengan `viewport-fit=cover` dan `interactive-widget=resizes-content`, serta padding aman `env(safe-area-inset-bottom, 0px)` diterapkan pada `BottomNav`, `QuickAddBar`, `Toast`, `AppShell`, dan `scroll-padding-bottom` global.
- **Keputusan 2 (Kebijakan Versi PATCH `0.3.1` Atas Permintaan Pemilik Proyek):**
  - Fitur jadwal kiriman mingguan (`paydayRepeat: 'weekly'` + `paydayWeekday`) secara sengaja dirilis sebagai versi PATCH **`0.3.1`** atas permintaan pemilik proyek agar selaras dengan bundel rilis kecil bersama perbaikan bug navigasi, meskipun dalam konvensi SemVer (`0.x`) penambahan fitur fungsional lazimnya dinaikkan ke tingkat MINOR (`0.4.0`).
- **Keputusan 3 (Kompatibilitas Penuh Tanpa Naik Versi Skema Dexie):**
  - Penambahan `paydayRepeat` dan `paydayWeekday` tetap memakai skema Dexie v1 tanpa migrasi tabel. Fungsi `normalizeSettings` menormalkan baris lama (`paydayDay != null` -> `'monthly'`, selain itu `'none'`), dan `SettingsSchema` Zod menerima berkas ekspor JSON lama yang belum memiliki field baru tanpa menaikkan `schemaVersion`.
