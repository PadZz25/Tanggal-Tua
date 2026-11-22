import { expect, test } from '@playwright/test';
import { attachZeroThirdPartyGuard } from './helpers';

let verifyZeroThirdParty: (() => void) | null = null;

test.beforeEach(({ page }) => {
  verifyZeroThirdParty = attachZeroThirdPartyGuard(page);
});

test.afterEach(() => {
  verifyZeroThirdParty?.();
  verifyZeroThirdParty = null;
});

async function completeInitialOnboarding(
  page: import('@playwright/test').Page,
  expectedAllowance = 'Rp 65rb'
) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
  ).toBeVisible();
  await page.getByLabel('Saldo saat ini').fill('845rb');
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('button', { name: 'Lanjut' }).click();
  await page.getByRole('button', { name: 'Lihat jatah harianku' }).click();
  await expect(page.getByTestId('onboarding-final-allowance')).toHaveText(
    expectedAllowance
  );
  await page.getByRole('button', { name: 'Mulai' }).click();
  await expect(page.getByTestId('hero-allowance-amount')).toHaveText(
    expectedAllowance
  );
}

test.describe('Tanggal Tua E2E Flows (0.3.0 Tugas 5)', () => {
  test('(a)-(d): Sisa uang + Undo, Ringkasan totals/donut/legend sum 100%, period switcher + disabled bounds, and filtered Riwayat chip removal', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeInitialOnboarding(page);

    // (a) Beranda displays "Sisa uang Rp 845.000", updates after quick-add, reverts on Batalkan
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 845.000');

    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('kopi 18rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();

    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 47rb');
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 827.000');

    await page.getByRole('button', { name: 'Batalkan' }).click();
    await expect(page.getByTestId('hero-allowance-amount')).toHaveText('Rp 65rb');
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 845.000');

    // (b) Add multiple transactions across categories -> Ringkasan shows totals, donut, and legend percentages summing to 100
    for (const entry of ['makan siang 60rb', 'kopi 40rb', 'parkir 20rb']) {
      await quickInput.fill(entry);
      await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
      await expect(quickInput).toHaveValue('');
    }

    await page.getByRole('link', { name: 'Ringkasan' }).click();
    await expect(page.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 120.000');

    // Check donut aria-label & verify legend percentages sum to 100
    const donut = page.getByRole('img', { name: /Pengeluaran 16–22 Nov:/i });
    await expect(donut).toBeVisible();
    const donutLabel = (await donut.getAttribute('aria-label')) ?? '';
    const percents = Array.from(donutLabel.matchAll(/(\d+)%/g)).map((m) => Number(m[1]));
    expect(percents.length).toBe(3);
    expect(percents.reduce((a, b) => a + b, 0)).toBe(100);

    // (c) Switch Minggu/Bulan, verify URL state + browser back + disabled bounds (openingDate = 2026-11-18)
    await expect(page.getByRole('button', { name: 'Periode berikutnya' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Periode sebelumnya' })).toBeDisabled();

    await page.getByRole('button', { name: 'Bulan', exact: true }).click();
    await expect(page).toHaveURL(/periode=bulan/);
    await expect(page.getByTestId('summary-period-label')).toHaveText('November 2026');
    await expect(page.getByRole('button', { name: 'Periode berikutnya' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Periode sebelumnya' })).toBeDisabled();

    await page.goBack();
    await expect(page.getByTestId('summary-period-label')).toHaveText('16–22 Nov');

    await page.getByRole('button', { name: 'Bulan', exact: true }).click();
    await expect(page.getByTestId('summary-period-label')).toHaveText('November 2026');
    await page.getByRole('button', { name: 'Minggu', exact: true }).click();
    await expect(page.getByTestId('summary-period-label')).toHaveText('16–22 Nov');

    // (d) Click category Makan in legend -> Riwayat filtered + removable chip
    await page.getByRole('link', { name: /Makan/i }).click();
    await expect(page.getByRole('heading', { name: 'Riwayat' })).toBeVisible();
    await expect(page.getByTestId('history-filter-chip')).toContainText('Makan · 16–22 Nov');
    await expect(page.getByText('Makan siang', { exact: true })).toBeVisible();
    await expect(page.getByText('Kopi', { exact: true })).not.toBeVisible();

    await page.getByTestId('history-filter-chip').click();
    await expect(page.getByTestId('history-filter-chip')).not.toBeVisible();
    await expect(page.getByText('Kopi', { exact: true })).toBeVisible();
    await expect(page.getByText('Parkir', { exact: true })).toBeVisible();
  });

  test('Bug A & B: Theme persists after reload (< 3s) and blocked DB shows recovery screen', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeInitialOnboarding(page);

    await page.getByRole('link', { name: 'Pengaturan' }).click();
    await expect(page.getByText(/Versi 1\.0\.2/i)).toBeVisible();

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

  test('(e) & (f): full offline operation (Beranda, Ringkasan, Riwayat) and PWA update reload preserving user data', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeInitialOnboarding(page);

    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('nasi padang 25rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 820.000');

    // Wait for SW ready so offline reload works
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // (e) Go offline -> reload -> navigate Ringkasan & Riwayat -> add offline transaction
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 820.000', {
      timeout: 3_000,
    });

    await page.getByPlaceholder('Ketik: kopi 18rb').fill('es teh 5rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 815.000');

    await page.getByRole('link', { name: 'Ringkasan' }).click();
    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 30.000');

    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByRole('heading', { name: 'Riwayat' })).toBeVisible();
    await expect(page.getByText('Nasi padang', { exact: true })).toBeVisible();
    await expect(page.getByText('Es teh', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Ringkasan' }).click();
    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 30.000');

    await context.setOffline(false);

    // (f) Simulate PWA update waiting toast ("Versi baru tersedia · Muat ulang") -> reload -> old data intact
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tanggal-tua-sw-update-waiting'));
    });

    await expect(page.getByText('Versi baru tersedia · Muat ulang')).toBeVisible();
    await page.getByRole('button', { name: 'Muat ulang' }).click();

    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 30.000', {
      timeout: 3_000,
    });
    await page.getByRole('link', { name: 'Beranda' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 815.000');
  });

  test('0.3.1 Tugas 1: BottomNav stays visible on focus without shrink and recovers when keyboard closes without blur', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeInitialOnboarding(page);

    const nav = page.getByRole('navigation', { name: 'Navigasi utama' });
    const navElement = page.locator('nav[aria-label="Navigasi utama"]');
    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');

    await expect(nav).toBeVisible();
    await quickInput.click();
    await expect(quickInput).toBeFocused();
    await expect(nav).toBeVisible();

    // Simulate soft keyboard opening (~344px) while input stays focused
    await page.setViewportSize({ width: 390, height: 500 });
    await expect(navElement).toHaveAttribute('data-nav-hidden', 'true');
    await expect(nav).not.toBeVisible();

    const inputBox = await quickInput.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(500);

    // Simulate Android Back closing keyboard WITHOUT firing blur (input remains activeElement)
    await page.setViewportSize({ width: 390, height: 844 });
    const isStillFocused = await page.evaluate(
      () => document.activeElement?.getAttribute('placeholder') === 'Ketik: kopi 18rb'
    );
    expect(isStillFocused).toBe(true);
    await expect(navElement).toHaveAttribute('data-nav-hidden', 'false');
    await expect(nav).toBeVisible();

    // Saving a note keeps BottomNav visible and dock back above BottomNav
    await quickInput.fill('kopi 18rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(nav).toBeVisible();
  });

  test('0.3.1 Tugas 2: weekly payday persists across reload, rolls +7 on payday without auto-income, works offline, and survives SW update reload', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      const mocked = sessionStorage.getItem('__mock_today');
      window.__TANGGAL_TUA_TODAY__ = mocked || '2026-11-21';
    });

    await completeInitialOnboarding(page, 'Rp 84,5rb');

    await page.getByRole('link', { name: 'Pengaturan' }).click();
    await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible();

    await page.getByRole('radio', { name: 'Tiap minggu' }).click();
    await page.getByRole('radio', { name: 'Sabtu' }).click();
    await expect(page.getByTestId('payday-weekly-preview')).toHaveText(
      'Kiriman berikutnya: Sabtu, 28 Nov (7 hari lagi)'
    );

    // Reload -> weekly option and weekday stay selected
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Tiap minggu' })).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 3_000 }
    );
    await expect(page.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    // Go to Beranda -> Hero chip shows next Saturday & 7 days left
    await page.getByRole('link', { name: 'Beranda' }).click();
    await expect(page.getByText('Kiriman 28 Nov · 7 hari lagi')).toBeVisible();

    // Wait for SW registration before offline test
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Advance clock to payday (2026-11-28) -> banner appears, payday shifts +7 to 5 Des, NO auto income
    await page.evaluate(() => sessionStorage.setItem('__mock_today', '2026-11-28'));
    await page.reload();
    await expect(page.getByText('Kiriman sudah masuk? Catat')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.getByText('Kiriman 5 Des · 7 hari lagi')).toBeVisible();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 845.000');

    // Works completely offline
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Kiriman 5 Des · 7 hari lagi')).toBeVisible({
      timeout: 3_000,
    });
    await page.getByRole('link', { name: 'Pengaturan' }).click();
    await expect(page.getByRole('radio', { name: 'Tiap minggu' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.getByRole('radio', { name: 'Sabtu' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await context.setOffline(false);

    // Simulate PWA update banner ("Versi baru tersedia · Muat ulang") -> reload keeps data intact
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tanggal-tua-sw-update-waiting'));
    });
    await expect(page.getByText('Versi baru tersedia · Muat ulang')).toBeVisible();
    await page.getByRole('button', { name: 'Muat ulang' }).click();

    await expect(page.getByRole('radio', { name: 'Tiap minggu' })).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 3_000 }
    );
    await page.getByRole('link', { name: 'Beranda' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 845.000');
  });
});
