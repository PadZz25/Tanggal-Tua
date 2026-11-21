# Daftar Uji QA Manual Perangkat Nyata (Sebelum Tag v1.0.0)

Jalankan checklist ini pada perangkat fisik (atau deploy pratinjau HTTPS) sebelum menuliskan **"rilis 1.0.0"** untuk menandai rilis stabil.

- [ ] **1. Instalasi Android Chrome (Android 14–16):**
  Buka aplikasi melalui Chrome HTTPS (bukan WebView WhatsApp/Telegram), pastikan tombol/prompt **Instal** muncul, aplikasi terpasang ke layar utama, ikon tampil tajam, dan membuka dalam mode *standalone* tanpa bilah alamat.
- [ ] **2. Tambah ke Layar Utama iOS Safari:**
  Buka di Safari iPhone/iPad, pastikan kartu panduan **"Pasang ke Layar Utama"** muncul di Beranda dan Pengaturan -> Tentang (dengan ikon inline), tombol Instal Android tidak tampil, lalu uji ikuti langkah *Bagikan -> Tambah ke Layar Utama*. Pastikan setelah dibuka dari Layar Utama panduan iOS tidak lagi tampil.
- [ ] **3. Mode Pesawat Penuh (Offline Total):**
  Setelah membuka app minimal sekali secara online, aktifkan Mode Pesawat. Muat ulang aplikasi, lalu uji: catat cepat `"kopi 18rb"`, tambah target tabungan & setor, setel anggaran hingga lewat 80%, buka Ringkasan dan Riwayat, serta tekan **Tambah ke kalender**. Seluruh alur harus berjalan tanpa error jaringan.
- [ ] **4. Pembaruan dari Versi Sebelumnya (0.3.x ke 1.0.0):**
  Pada browser/HP yang masih memiliki data `0.3.x`, deploy build 1.0.0, tunggu toast **"Versi baru tersedia · Muat ulang"**, ketuk **Muat ulang**, pastikan seluruh transaksi, template, dan pengaturan tetap utuh serta halaman baru (Target, Anggaran) terbuka lancar.
- [ ] **5. Cadangan & Pemulihan di Perangkat Lain:**
  Di perangkat A, buka Pengaturan -> Cadangan & Data Lokal -> **Export JSON (Penuh)**. Kirim berkas `.json` ke perangkat B, impor dengan mode **Ganti semua** dan uji **Gabungkan data**, pastikan transaksi, target tabungan (`goals`), penanda tanpa pengeluaran (`dayMarks`), dan anggaran (`budgets`) ikut pulih.
- [ ] **6. Pergantian Tema (Terang, Gelap, Sistem):**
  Uji ketiga pilihan tema di Pengaturan pada Beranda (termasuk mode *Tanggal Tua*), Ringkasan, Anggaran, dan Target. Pastikan penanda aktif di Pengaturan tetap sinkron sesudah refresh dan teks mudah dibaca.
- [ ] **7. Pergantian Hari / Tengah Malam (`00:00`):**
  Biarkan aplikasi terbuka melewati pergantian hari atau ubah jam perangkat ke keesokan harinya lalu buka kembali app. Pastikan jatah harian dihitung ulang untuk hari baru, `spentToday` kembali Rp 0, daftar **Hari ini** bersih, dan status streak tetap akurat.
- [ ] **8. Impor Jadwal Pengingat Kalender (`.ics`):**
  Aktifkan pengingat di Pengaturan, atur jam (misalnya `20:00`), ketuk **Tambah ke kalender**, lalu impor berkas `tanggal-tua-pengingat.ics` ke Google Calendar / Apple Calendar. Pastikan jadwal harian berulang pada jam lokal yang dipilih dengan alarm tepat waktu.
- [ ] **9. Shortcut Ikon Layar Utama (Android):**
  Tekan tahan ikon app **Tanggal Tua** di launcher Android, pilih shortcut **"Catat pengeluaran"** (harus langsung membuka Beranda dengan fokus pada kolom input cepat dan URL bersih), lalu uji shortcut **"Ringkasan"** (langsung membuka `/ringkasan`).
