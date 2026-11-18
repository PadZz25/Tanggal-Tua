# Studi Kasus Portofolio: Tanggal Tua

## 1. Masalah dan Pengguna

Bagi banyak mahasiswa dan pekerja muda (Gen Z) di Indonesia yang hidup dari kiriman bulanan atau gaji pertama, pertanyaan finansial paling nyata setiap hari bukanlah *"Berapa rasio pengeluaran bulananku?"*, melainkan:

> *"Hari ini aku masih boleh jajan berapa?"*

Mayoritas aplikasi pencatat keuangan gagal bertahan lebih dari beberapa minggu di ponsel pengguna karena tiga alasan utama:
1. Mencatat pengeluaran terasa seperti pekerjaan administrasi yang memakan banyak ketukan layar.
2. Halaman utama menampilkan grafik akuntansi masa lalu, bukan angka keputusan untuk hari ini.
3. Banyak aplikasi mengharuskan login akun atau koneksi bank yang mengurangi kenyamanan privasi dan tidak bisa diandalkan saat sinyal lemah.

## 2. Riset Pesaing dan Celah Pasar

Aplikasi global (seperti YNAB, Monarch Money, Spendee) dan aplikasi populer di Indonesia (seperti Money Lover, Wallet, Monefy, DompetKu) umumnya berfokus pada pembukuan multi-rekening atau laporan bulanan.

**Tanggal Tua** mengambil celah yang spesifik:
- **Satu angka keputusan:** Sisa jatah harian yang dihitung otomatis dari saldo saat ini dibagi sisa hari menuju tanggal kiriman berikutnya.
- **Input 5 detik berbahasa sehari-hari:** Mendukung ketikan gaya chat (`kopi 18rb`, `makan siang 15k`, `kiriman ortu 1,5jt`) dan chip template satu ketuk.
- **Local-first & Offline penuh:** Seluruh data tersimpan di IndexedDB perangkat pengguna tanpa server, tanpa akun, dan tanpa pelacak pihak ketiga.

## 3. Keputusan Produk dan Hal yang Sengaja Tidak Dibangun

**Tiga pilar inti produk:**
1. **Sisa jatah harian di layar utama:** Menambah pengeluaran hari ini hanya mengurangi sisa jatah hari ini (`remainingToday`) tanpa mengubah plafon jatah harian (`dailyAllowance`) hari tersebut. Jika hari ini lewat batas, selisihnya otomatis menyesuaikan jatah hari-hari berikutnya.
2. **Tanpa rasa bersalah:** Saat jatah menipis (`Mode Tanggal Tua`) atau lewat batas, warna hero beralih ke terakota hangat (`#9E3F27`) dengan pesan maskot Receh yang menenangkan, bukan warna merah menyala atau kalimat yang menghakimi.
3. **Kepemilikan data penuh:** Pengguna dapat mengekspor data ke JSON berversi maupun CSV (UTF-8 dengan BOM untuk Excel) serta memulihkannya kapan saja.

**Hal yang sengaja tidak dibangun (Non-goals):**
- Koneksi bank, pembacaan SMS/notifikasi otomatis, atau integrasi pembayaran.
- Multi-mata-uang, portofolio investasi, kripto, atau laporan pajak.
- Kewajiban membuat akun dan pengiriman data ke server.

## 4. Desain dan Aksesibilitas

Karakter visual **Tanggal Tua** dirancang tenang di struktur, hangat di detail, dan lokal di bahasa:
- **Palet Warna Teruji WCAG 2.2 AA:** Seluruh pasangan teks dan latar belakang (termasuk seluruh 9 nada warna kategori pada mode terang maupun gelap, serta chip transparan di atas kartu hero) diverifikasi secara matematis memiliki kontras ≥ 4.5:1 untuk teks normal dan ≥ 3.0:1 untuk batas komponen interaktif.
- **Maskot "Receh":** Koin SVG ringan yang mengubah ekspresi wajah (`smile`, `flat`, `oops`, `sleepy`) dan memberikan satu kalimat pendamping yang deterministik setiap hari sesuai kondisi saldo.
- **Aksesibilitas Penuh:** Menggunakan elemen HTML semantik (`<dialog>` asli untuk bottom sheet, `<button>`, `<label>` terhubung, `role="status"` untuk toast undo 5 detik), navigasi keyboard lengkap, serta menghormati pengaturan `prefers-reduced-motion`.

## 5. Arsitektur Teknis dan Tantangan

Aplikasi dibangun dengan pemisahan lapisan satu arah yang ketat:
- **`src/domain/` (Fungsi Murni):** Seluruh aturan perhitungan jatah harian (`computeAllowance`, `getHomeState`), pemformatan Rupiah (`formatShort`, `formatFull`), perhitungan tanggal (`daysBetween`, `rollPayday`), dan parser teks (`parseQuickAdd`) ditulis sebagai fungsi TypeScript murni tanpa ketergantungan pada React maupun IndexedDB.
- **`src/data/` (Penyimpanan Lokal):** Mengelola IndexedDB melalui Dexie v1, validasi skema menggunakan Zod, dan transaksi atomik saat impor data agar file yang tidak valid tidak pernah merusak data pengguna.
- **`src/features/` & `src/components/` (Antarmuka):** Komponen React yang membaca data melalui repositori dan hooks reaktif, dilengkapi pengelolaan pergantian hari otomatis tepat pukul 00:00 waktu lokal serta saat aplikasi kembali aktif (`visibilitychange`).

## 6. Pengujian dan Kualitas

- **Unit Test (Vitest):** Menguji seluruh kasus perhitungan jatah harian, prioritas 6 state beranda, parser teks cepat (termasuk disambiguasi kata kunci dan batas nominal), putaran penuh ekspor/impor JSON & CSV, serta audit rasio kontras warna otomatis.
- **Component & E2E Test:** Memastikan alur onboarding, pencatatan cepat, pembatalan (undo 5 detik), pengelolaan riwayat, pergantian tema, dan ketahanan mode offline berjalan mulus.
- **Pengukuran Lighthouse:** Tidak diklaim tanpa pengukuran nyata pada build produksi (`not measured` hingga diuji langsung melalui Lighthouse CLI/DevTools).

## 7. Langkah Berikutnya (Roadmap P1 & P2)

- **P1:** Fitur patungan dan catatan utang teman, transaksi berulang otomatis, kategori kustom, ringkasan bulanan, serta pemisahan multi-nominal dalam satu input (`es teh 4rb dan parkir 2rb`).
- **P2:** Pencatatan via suara (`Web Speech API` Bahasa Indonesia) dan enkripsi cadangan lokal menggunakan passphrase.
