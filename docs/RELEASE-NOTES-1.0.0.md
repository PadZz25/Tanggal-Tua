# Catatan Rilis Tanggal Tua v1.0.0

Tanggal Tua 1.0.0 adalah rilis stabil pertama aplikasi pencatat keuangan harian lokal untuk mahasiswa dan pekerja muda Indonesia. Rilis ini melengkapi jawaban harian **"Hari ini masih boleh jajan berapa?"** dengan kendali penuh terhadap kebiasaan, anggaran kategori, target tabungan, dan perlindungan data di perangkatmu sendiri.

## Fitur Baru di 1.0.0

- **Target Tabungan (`/target`):** Simpan hingga 3 target aktif sekaligus dengan proyeksi kebutuhan per hari. Menabung memotong saldo bebas tanpa mengganggu metrik `spentToday` maupun grafik belanja di Ringkasan, serta mendukung penyelesaian saat barang terbeli atau pengembalian saldo otomatis jika diarsipkan.
- **Anggaran per Kategori (`/anggaran`):** Tetapkan batas mingguan atau bulanan per kategori pengeluaran. Pantau status aman, hampir habis (>= 80%), atau lewat batas dengan bahasa tenang tanpa warna merah/hijau menghakimi, ringkasan 3 teratas di Ringkasan, satu baris alert di Beranda bila mendekati/lewat batas, dan toast saat transaksi baru melampaui ambang.
- **Insight Berbasis Aturan:** Kartu Ringkasan menampilkan hingga 3 insight lokal yang bisa dibuka penjelasannya melalui tombol **"Kenapa muncul?"** (kenaikan/penurunan adil vs periode lalu, kategori paling berpengaruh, estimasi sisa periode, dan kebiasaan teratas).
- **Streak Mencatat Ramah & Penanda Tanpa Pengeluaran:** Pil streak di Beranda dengan kalender titik 14 hari terakhir, opsi menandai **"Hari ini tidak ada pengeluaran"**, serta ekspresi baru maskot Receh (`cheer` dan `wink`) pada tonggak 3, 7, 14, 30, 60, dan 100 hari.
- **Pengingat Lokal & Jadwal Kalender (`.ics`):** Pengingat lembut di dalam aplikasi setelah jam pilihan lewat dan hari ini belum tercatat, ditambah tombol ekspor `.ics` berulang harian untuk aplikasi kalender bawaan tanpa server maupun izin notifikasi browser.
- **Shortcut Ikon Aplikasi:** Pintasan manifest Android untuk langsung ke **"Catat pengeluaran"** (`/?aksi=catat`) dan **"Ringkasan"** (`/ringkasan`).
- **Pelindung Data & Panduan iPhone:** Pengingat cadangan JSON setelah >= 10 transaksi dan > 30 hari belum ekspor (bisa ditunda 7 hari), status penyimpanan permanen browser (`navigator.storage.persist()`), panduan langkah pasang Safari iPhone dengan ikon inline, dan aturan ketat maksimal **1 banner** aktif di Beranda.

## Peningkatan Arsitektur & Kompatibilitas

- **Migrasi Skema Dexie v2:** Satu migrasi gabungan (`goals`, `dayMarks`, `budgets`, kolom `goalId`, kategori sistem tabungan) lengkap dengan ekspor cadangan darurat data lama bila terjadi kegagalan upgrade.
- **Perlindungan Transaksi Tabungan:** Transaksi tertaut target (`goalId`) dilindungi dari penyuntingan/penghapusan langsung di Riwayat dan selalu dikecualikan dari `spentToday` serta total pengeluaran/pemasukan Ringkasan.

Seluruh data tersimpan 100% lokal di browser (IndexedDB), bekerja penuh offline, dan bebas pelacak pihak ketiga.
