# Kebijakan Keamanan (SECURITY.md)

## Arsitektur Privasi & Penyimpanan Data

**Tanggal Tua** adalah aplikasi *local-first* murni:
- Seluruh data keuangan (saldo, transaksi, template, dan pengaturan) disimpan **hanya di perangkat pengguna** menggunakan IndexedDB.
- Aplikasi **tidak memiliki server backend**, tidak memerlukan pembuatan akun, dan tidak mengirimkan data ke pihak ketiga mana pun.
- File hasil ekspor (`.json` dan `.csv`) disimpan langsung ke perangkat pengguna tanpa enkripsi agar mudah dibuka dan dicadangkan. Jaga kerahasiaan file ekspor Anda.

## Melaporkan Celah Keamanan

Jika Anda menemukan celah keamanan (misalnya potensi *Cross-Site Scripting* melalui file impor atau kelemahan validasi skema), mohon jangan membuka *issue* publik terlebih dahulu:

1. Laporkan melalui fitur **Private Vulnerability Reporting** di repositori GitHub proyek ini, atau hubungi pemilik proyek secara langsung.
2. Sertakan langkah-langkah reproduksi singkat dan dampak potensialnya.
3. Kami akan meninjau laporan dan merilis perbaikan sesegera mungkin.
