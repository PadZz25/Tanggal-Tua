# Changelog

Seluruh perubahan penting pada proyek **Tanggal Tua** dicatat di dokumen ini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dan penomoran versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [1.0.2] - 2026-11-22

### Added
- Aksi **Ubah** target tabungan aktif (`/target/:id`) memakai form sheet yang sama dengan Buat target untuk mengubah nama, nominal target, dan tanggal target dengan pembaruan `lastMilestone` aman tanpa toast perayaan palsu serta penanganan target lewat tanggal (`"Lewat tanggal target. Mau ubah tanggalnya?"`).
- Aksi **Hapus** target tabungan (dalam satu transaksi Dexie dengan toast `"Target dihapus"` dan **"Batalkan"** 5 detik via snapshot memori) mencakup konfirmasi target kosong, dua pilihan (`"Hapus permanen"` atau `"Arsipkan"`) untuk target bertaut transaksi, serta hapus permanen untuk target arsip.
- Aksi **Sembunyikan** khusus target selesai dibeli (`'completed'`) agar dipindahkan ke arsip tanpa membuat transaksi `"Tarik tabungan"`, dan tautan **"Lihat arsip"** pada daftar `/target`.
- Tombol **"Batalkan penanda hari ini"** pada `StreakSheet` untuk mencabut penanda hari tanpa pengeluaran (`dayMarks`), serta tombol `"Batalkan"` saat menghapus template catat cepat dan anggaran.

### Fixed
- Target tabungan yang salah atau tidak lagi dipakai kini bisa diubah atau dihapus permanen sehingga langsung membebaskan kuota 3 target aktif.
- Transaksi yatim (`goalId` tanpa target di `goals`) tidak lagi terkunci di Riwayat maupun Beranda, tidak menampilkan lencana `"Tabungan"`, dan bebas diubah atau dihapus seperti transaksi biasa.
- Menghapus seluruh template catat cepat di Pengaturan tidak lagi memunculkan kembali template bawaan saat aktif maupun setelah muat ulang.

## [1.0.1] - 2026-11-22

### Changed
- Pil streak (`N hari`) dipindahkan dari baris `Catat cepat` ke sisi kanan header atas Beranda berdampingan dengan tombol `+` agar tata letak Beranda lebih rapi dan proporsional.
- Tombol `Instal` ringkas dilepas dari header Beranda supaya ruang header tetap lega pada layar sempit; opsi pemasangan aplikasi tetap tersedia di Pengaturan dan Onboarding.

## [1.0.0] - 2026-11-22

### Added
- Kartu **Insight** berbasis aturan pada Ringkasan (`R4 -> R1 -> R2 -> R3`, maks 3) lengkap dengan kontrol aksesibel **"Kenapa muncul?"** dan perbandingan adil terhadap periode sebelumnya.
- **Streak mencatat ramah** di Beranda (`StreakSheet` 14 hari terakhir), penanda **"Hari ini tidak ada pengeluaran"** (`dayMarks`) dengan undo, serta ekspresi maskot Receh baru (`cheer` dan `wink`) pada tonggak 3, 7, 14, 30, 60, dan 100 hari.
- Fitur **Target tabungan** (`/target` dan `/target/:id`, lazy-loaded) hingga 3 target aktif sekaligus dengan proyeksi tabungan harian, setor/tarik dana atomik, tandai terbeli, dan arsip dengan pengembalian otomatis ke saldo bebas.
- Fitur **Anggaran per kategori** (`/anggaran`, lazy-loaded) berbasis minggu/bulan kalender dengan toast saat melewati ambang 80%/100%, baris peringatan Beranda, dan kartu 3 teratas di Ringkasan.
- **Pengingat harian lokal** dalam aplikasi (saat jam pilihan terlewati dan hari ini belum tercatat), tombol unduh jadwal berulang **Tambah ke kalender** (`.ics` offline), serta dua **shortcut ikon** PWA (`"Catat pengeluaran"` ke `/?aksi=catat` dan `"Ringkasan"` ke `/ringkasan`).
- **Pengingat cadangan** JSON 30 hari (> 10 transaksi, tunda 7 hari), status cadangan terakhir di Pengaturan, **panduan instal Safari iOS** (ikon inline + kartu satu kali yang bisa ditutup), serta pemanggilan `navigator.storage.persist()` dengan indikator status **Penyimpanan permanen** di Pengaturan -> Tentang.

### Changed
- Perhitungan `spentToday` dan seluruh agregat belanja/pemasukan pada Ringkasan kini mengecualikan transaksi bertaut target tabungan (`goalId != null`), sementara transaksi tersebut tetap memengaruhi `currentBalance` dan menampilkan label **Tabungan** tanpa akses ubah/hapus langsung di Riwayat.
- Skema database lokal dinaikkan melalui satu migrasi gabungan **Dexie v2** (`goals`, `dayMarks`, `budgets`, indeks `goalId`, `isSystem`, dan 5 bidang pengaturan baru) lengkap dengan layar cadangan darurat jika upgrade gagal.
- Aturan **banner Beranda tunggal** berbasis prioritas (`kiriman > pengingat harian > anggaran > panduan iOS > cadangan`) agar layar utama tetap lega pada ponsel.

## [0.3.1] - 2026-11-21

### Added
- Dukungan jadwal kiriman berulang mingguan (`Tiap minggu`) di Onboarding langkah 2 dan Pengaturan dengan pilihan 7 chip hari (`Sen`–`Min`), pratinjau tanggal otomatis, serta pergeseran +7 hari otomatis tanpa membuat transaksi pemasukan otomatis.

### Fixed
- Navigasi bawah (`BottomNav`) tidak lagi hilang permanen setelah mengetuk input catat cepat atau saat keyboard Android ditutup lewat gestur *Back* tanpa `blur`; visibilitas navigasi kini diturunkan dari penyusutan `visualViewport` saat ini dan dilengkapi padding `safe-area-inset`.

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
