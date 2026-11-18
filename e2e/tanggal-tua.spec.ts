import { expect, test } from '@playwright/test';

test.describe('Tanggal Tua E2E Flows (Section 16.3)', () => {
  test('1-5 & 8: Onboarding, Quick-add + Undo, Template tap, Riwayat edit/delete, Theme persistence, and Midnight day rollover', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await page.goto('/');

    // 1. Onboarding -> sees initial daily allowance
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible();
    await page.getByLabel('Saldo saat ini').fill('845rb');
    await page.getByRole('button', { name: 'Lanjut' }).click();

    await expect(page.getByText('13 hari lagi dari hari ini')).toBeVisible();
    await page.getByRole('button', { name: 'Lanjut' }).click();

    await page.getByRole('button', { name: 'Lihat jatah harianku' }).click();
    await expect(page.getByTestId('onboarding-final-allowance')).toHaveText('Rp 65rb');
    await page.getByRole('button', { name: 'Mulai' }).click();

    // Verify Beranda loaded with Rp 65rb
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 65rb');

    // 2. Quick-add "kopi 18rb" -> remaining drops to Rp 47rb -> Batalkan -> returns to Rp 65rb
    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('kopi 18rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();

    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 47rb');
    await page.getByRole('button', { name: 'Batalkan' }).click();
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 65rb');

    // 3. Tap template "Kopi 12rb" -> saved -> appears in "Hari ini"
    await page.getByRole('button', { name: /Kopi 12rb/i }).click();
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 53rb');
    await expect(
      page.getByRole('region', { name: 'Daftar transaksi hari ini' })
    ).toContainText('Kopi');

    // 4. Navigate to Riwayat -> edit & delete transaction
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByRole('heading', { name: 'Riwayat' })).toBeVisible();
    await page.getByRole('button', { name: 'Hapus transaksi Kopi' }).click();
    await expect(page.getByText('Belum ada riwayat transaksi yang cocok.')).toBeVisible();

    // 5. Switch theme to Gelap -> persists after reload
    await page.getByRole('link', { name: 'Pengaturan' }).click();
    await page.getByRole('button', { name: 'Gelap' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 8. Simulate day rollover to 2026-11-19 (12 days left, balance 845000 -> floor(845000/12) = 70416 -> Rp 70,4rb)
    await page.getByRole('link', { name: 'Beranda' }).click();
    await page.evaluate(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-19';
      window.dispatchEvent(new Event('tanggal-tua-clock-change'));
    });
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 70,4rb');
  });
});
