# Rencana Pengembangan Tanggal Tua

> Catatan: Daftar di bawah ini berisi arah dan ide pengembangan yang sedang dipertimbangkan. Seluruh item bersifat fleksibel, **bisa berubah, ditunda, atau dibatalkan sewaktu-waktu**, dan bukan merupakan komitmen tanggal rilis maupun nomor versi tertentu.

Untuk melihat fitur yang sudah dirilis hingga saat ini (termasuk Ringkasan mingguan dan bulanan pada versi 0.3.0), baca [CHANGELOG.md](../CHANGELOG.md).

## Pencatatan Lebih Cepat & Fleksibel

- **Pemisahan multi-nominal dalam satu baris input:** Mengenali beberapa pengeluaran sekaligus dari satu kalimat catat cepat (misalnya `es teh 4rb dan parkir 2rb`) lalu menyimpannya sebagai catatan terpisah.
- **Transaksi berulang otomatis:** Penjadwalan catatan rutin seperti bayar kos, paket data, atau pemasukan bulanan tanpa perlu mengetik ulang setiap siklus.
- **Kategori kustom:** Menambah, mengubah nama, atau menonaktifkan kategori pengeluaran maupun pemasukan sesuai kebutuhan masing-masing pengguna.
- **Input suara Bahasa Indonesia:** Mencatat transaksi melalui pengenalan suara browser (`Web Speech API`) yang langsung diproses ke pratinjau catat cepat sebelum disimpan.

## Penelusuran & Wawasan Pengeluaran

- **Pencarian di halaman Riwayat:** Mencari transaksi berdasarkan kata kunci catatan atau rentang nominal tertentu.
- **Wawasan tren lanjutan:** Membantu melihat pola pengeluaran lintas beberapa bulan tanpa menambah kerumitan tampilan utama.

## Berbagi Pengeluaran dengan Teman

- **Catatan patungan dan utang teman:** Mencatat tagihan yang dibagi bersama teman dan menandai siapa yang sudah atau belum mengganti, agar saldo pribadi tidak tercampur dengan talangan.

## Perlindungan & Pencadangan Data

- **Enkripsi cadangan lokal:** Melindungi berkas ekspor JSON dengan kata sandi pilihan pengguna sebelum disimpan ke perangkat atau penyimpanan awan pribadi.
- **Pengingat cadangan berkala:** Pengingat ringan di dalam aplikasi agar pengguna rutin mengekspor data sebelum mengganti perangkat atau membersihkan data browser.
