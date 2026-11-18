# Changelog

Seluruh perubahan penting pada proyek **Tanggal Tua** dicatat di dokumen ini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan penomoran versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [1.0.0] - 2026-11-18

### Ditambahkan
- Perhitungan jatah harian otomatis (`computeAllowance`) dan 6 state beranda (`normal`, `fresh`, `tanggal-tua`, `over`, `broke`, `payday-needed`).
- Parser catat cepat gaya chat Bahasa Indonesia (`parseQuickAdd`) dengan dukungan nominal singkat (`18rb`, `1,5jt`, `rp 25.000`), deteksi kategori otomatis, kata tanggal `kemarin`, dan pembatalan 5 detik.
- Chip template satu ketuk dengan urutan otomatis berdasarkan frekuensi pemakaian.
- Alur onboarding 3 langkah singkat (saldo saat ini, tanggal kiriman berikutnya, dan pilihan tema).
- Form transaksi lengkap (bottom sheet) untuk menambah, mengubah, dan menghapus pengeluaran maupun pemasukan.
- Halaman Riwayat yang dikelompokkan per hari dengan filter jenis transaksi dan total pengeluaran harian.
- Halaman Pengaturan lengkap: tema (Sistem, Terang, Gelap), jadwal kiriman berulang, koreksi saldo (`adjustment`), kelola template, ekspor/impor JSON & CSV (UTF-8 BOM), serta hapus seluruh data lokal.
- Dukungan Progressive Web App (PWA) penuh untuk penggunaan offline beserta aset font Plus Jakarta Sans mandiri.
