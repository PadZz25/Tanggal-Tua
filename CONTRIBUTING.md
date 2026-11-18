# Panduan Kontribusi (CONTRIBUTING.md)

Terima kasih sudah tertarik berkontribusi pada **Tanggal Tua**.

## Menjalankan Proyek Secara Lokal

Prasyarat: **Node.js >= 20** dan **pnpm**.

```bash
pnpm install
pnpm dev
```

## Pemeriksaan Kualitas Sebelum Commit

Pastikan seluruh perintah berikut berjalan tanpa error sebelum membuat commit atau pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Aturan Arsitektur

1. **Fungsi bisnis murni di `src/domain/`:** Tidak boleh mengimpor React, Dexie, atau modul DOM. Semua fungsi wajib memiliki unit test.
2. **Akses data terpusat:** Komponen dan fitur di `src/features/` hanya mengakses IndexedDB melalui `src/data/repositories/`.
3. **Aksesibilitas & Kontras:** Gunakan elemen HTML semantik asli (`<button>`, `<dialog>`, `<label>`). Setiap pasangan warna teks normal wajib memenuhi rasio kontras WCAG AA ≥ 4.5:1.
4. **Bahasa & Gaya Teks:** Teks antarmuka menggunakan Bahasa Indonesia santai yang ramah dan tidak menghakimi. Hindari penggunaan karakter em dash pada teks UI dan dokumentasi.

## Konvensi Commit

Gunakan format *Conventional Commits* dalam Bahasa Indonesia yang lugas:

- `feat: tambah parser catat cepat untuk nominal rupiah`
- `fix: perbaiki kontras chip pada mode tanggal tua`
- `test: lengkapi pengujian ekspor dan impor data`
- `docs: perbarui panduan instalasi di README`
