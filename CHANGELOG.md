# Changelog

Seluruh perubahan penting pada proyek **Tanggal Tua** dicatat di dokumen ini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan penomoran versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [0.3.0] - 2026-11-19

### Added
- Halaman Ringkasan mingguan dan bulanan (`/ringkasan`, lazy-loaded) dengan navigasi periode `‹ ›` dan sinkronisasi URL.
- Chart donut SVG pengeluaran per kategori dengan token warna `--chart-1` sampai `--chart-9` teruji kontras (terang & gelap) serta pembulatan persen *largest remainder* berjumlah tepat 100.
- Chart batang pengeluaran per hari berbasis HTML/flex yang dapat difokus dan diketuk, lengkap dengan keterangan di bawah chart dan tabel `sr-only`.
- Perbandingan adil terhadap periode sebelumnya (jumlah hari yang sama untuk periode berjalan) dengan bahasa netral tanpa warna merah/hijau menghakimi.
- Dukungan filter kategori dan rentang tanggal (`?kategori=&dari=&sampai=`) di halaman Riwayat dengan chip filter yang bisa dihapus.
- Baris total `"Sisa uang"` (`formatFull`) di kartu hero Beranda pada semua state.

### Changed
- Navigasi bawah diperluas menjadi 4 item: Beranda, Riwayat, Ringkasan, Pengaturan.

### Fixed
- Celah pada koma di angka hero (`Rp 65,4rb`, `Rp 1,5jt`) dengan beralih ke angka proporsional dan penyesuaian kerning pemisah desimal.

## [0.2.0] - 2026-11-18

### Added
- Perluasan kata kunci pemasukan (kuat dan lemah) serta aturan 5 tingkat prioritas penentuan jenis transaksi di parser catat cepat.
- Penyuntikan versi otomatis `__APP_VERSION__` dari `package.json` ke halaman Pengaturan dan mekanisme pembaruan Service Worker.

### Fixed
- Penanda tema di Pengaturan (`role="radiogroup"` dengan `aria-checked`) kini selalu tersinkronisasi dengan `settings.theme` untuk pilihan Sistem, Terang, dan Gelap.
- Masalah loading tanpa akhir setelah refresh dengan menangani event `versionchange` dan `blocked` pada Dexie, pembaruan pengaturan secara parsial dengan fallback default, batas waktu bootstrap 5 detik, dan layar pemulihan cache tanpa menghapus data IndexedDB.

### Changed
- Kata kunci `"masuk"` tunggal dihapus dari pemicu pemasukan agar frasa pengeluaran seperti `"tiket masuk 25rb"` tidak salah terbaca sebagai pemasukan.
- Kata kunci `"transfer ortu"` diganti menjadi `"transfer dari"` dan `"dari ortu"`, sementara pola arah `"ke <orang>"` dipetakan sebagai pengeluaran.

## [0.1.0] - 2026-11-18

### Added
- Perhitungan jatah harian otomatis (`computeAllowance`) dan 6 state beranda (`normal`, `fresh`, `tanggal-tua`, `over`, `broke`, `payday-needed`).
- Parser catat cepat gaya chat Bahasa Indonesia (`parseQuickAdd`) dengan dukungan nominal singkat (`18rb`, `1,5jt`, `rp 25.000`), deteksi kategori otomatis, kata tanggal `kemarin`, dan pembatalan 5 detik.
- Chip template satu ketuk dengan urutan otomatis berdasarkan frekuensi pemakaian.
- Alur onboarding 3 langkah singkat (saldo saat ini, tanggal kiriman berikutnya, dan pilihan tema).
- Form transaksi lengkap (bottom sheet) untuk menambah, mengubah, dan menghapus pengeluaran maupun pemasukan.
- Halaman Riwayat yang dikelompokkan per hari dengan filter jenis transaksi dan total pengeluaran harian.
- Halaman Pengaturan lengkap: tema (Sistem, Terang, Gelap), jadwal kiriman berulang, koreksi saldo (`adjustment`), kelola template, ekspor/impor JSON & CSV (UTF-8 BOM), serta hapus seluruh data lokal.
- Dukungan Progressive Web App (PWA) penuh untuk penggunaan offline beserta aset font Plus Jakarta Sans mandiri.
