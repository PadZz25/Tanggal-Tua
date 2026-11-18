import { expect, test } from '@playwright/test';

test.describe('Tanggal Tua E2E Flows (Section 16.3 & Bug B Resilience)', () => {
  test('1-5 & 8: Onboarding, Quick-add + Undo, Template tap, Riwayat edit/delete, Theme reload < 3s, and Midnight day rollover', async ({
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

    // 4. Navigate to Riwayat -> delete transaction
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByRole('heading', { name: 'Riwayat' })).toBeVisible();
    await page.getByRole('button', { name: 'Hapus transaksi Kopi' }).click();
    await expect(page.getByText('Belum ada riwayat transaksi yang cocok.')).toBeVisible();

    // 5. Switch theme to Gelap (Bug A & Bug B) -> persists after reload and UI renders in < 3 seconds
    await page.getByRole('link', { name: 'Pengaturan' }).click();
    const darkRadio = page.getByRole('radio', { name: 'Gelap' });
    await darkRadio.click();
    await expect(darkRadio).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const reloadStart = Date.now();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible({
      timeout: 3_000,
    });
    expect(Date.now() - reloadStart).toBeLessThan(3_000);
    await expect(page.getByRole('radio', { name: 'Gelap' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 8. Simulate day rollover to 2026-11-19
    await page.getByRole('link', { name: 'Beranda' }).click();
    await page.evaluate(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-19';
      window.dispatchEvent(new Event('tanggal-tua-clock-change'));
    });
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 70,4rb');
  });

  test('Bug B: displays "Gagal memuat" recovery screen when IndexedDB is blocked', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__ = true;
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Gagal memuat' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Muat ulang' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reset cache aplikasi' })
    ).toBeVisible();
  });

  test('6 & Bug B: works offline and reloads cleanly while offline after initial visit', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible();

    // Wait for service worker registration to complete
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible({ timeout: 3_000 });
    await context.setOffline(false);
  });

  test('Tugas 4: displays "Versi baru tersedia · Muat ulang" toast when a new service worker is waiting and reloads cleanly', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible();

    // Trigger a waiting service worker update event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tanggal-tua-sw-update-waiting'));
    });

    await expect(page.getByText('Versi baru tersedia · Muat ulang')).toBeVisible();
    await page.getByRole('button', { name: 'Muat ulang' }).click();
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible({ timeout: 3_000 });
  });
});
