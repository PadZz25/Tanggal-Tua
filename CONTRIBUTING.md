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
pnpm test:e2e
pnpm build
```

## Aturan Arsitektur

1. **Fungsi bisnis murni di `src/domain/`:** Tidak boleh mengimpor React, Dexie, atau modul DOM, serta wajib deterministik (terima `today` sebagai parameter). Semua fungsi wajib memiliki unit test.
2. **Akses data terpusat:** Komponen dan fitur di `src/features/` hanya mengakses IndexedDB melalui `src/data/repositories/`.
3. **Aksesibilitas & Kontras:** Gunakan elemen HTML semantik asli (`<button>`, `<dialog>`, `<label>`, `role="switch"`). Setiap pasangan warna teks normal wajib memenuhi rasio kontras WCAG AA >= 4.5:1 (teruji di `src/styles/contrast.test.ts`).
4. **Bahasa & Gaya Teks:** Teks antarmuka memakai Bahasa Indonesia santai yang ramah dan tidak menghakimi. Jangan memakai karakter em dash pada teks UI, kode, maupun dokumentasi.

## Kebijakan Versi & Jaminan Migrasi

Proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/):

- **PATCH (`1.0.x`):** Perbaikan bug dan penyesuaian non-fungsional yang mempertahankan struktur data.
- **MINOR (`1.1.0`, `1.2.0`, dst.):** Fitur baru yang kompatibel ke belakang tanpa merusak data pengguna yang ada.
- **MAJOR (`2.0.0`, dst.):** Perubahan yang memutus kompatibilitas struktur data atau kontrak ekspor/impor.

**Jaminan migrasi:** Seluruh rilis menjamin migrasi data aman secara otomatis bagi pengguna yang memperbarui dari versi **>= 0.3** (Dexie v1 ke v2 dan seterusnya), disertai ekspor cadangan darurat apabila browser gagal menjalankan transaksi upgrade.

## Konvensi Commit

Gunakan format *Conventional Commits* dalam Bahasa Indonesia yang lugas:

- `feat(parser): tambah dukungan kata kunci pemasukan baru`
- `fix(nav): jaga visibilitas navigasi saat keyboard ditutup`
- `test(e2e): tambah skenario migrasi offline`
- `docs: perbarui panduan kontribusi`
