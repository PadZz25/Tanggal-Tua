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
