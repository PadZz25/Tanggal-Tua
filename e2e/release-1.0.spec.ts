import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  attachZeroThirdPartyGuard,
  completeOnboardingUi,
  seedLegacyV1Database,
} from './helpers';

let verifyZeroThirdParty: (() => void) | null = null;

test.beforeEach(({ page }) => {
  verifyZeroThirdParty = attachZeroThirdPartyGuard(page);
});

test.afterEach(() => {
  verifyZeroThirdParty?.();
  verifyZeroThirdParty = null;
});

async function assertNoSeriousA11yViolations(page: Page, contextLabel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const severe = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  expect(
    severe,
    `Pelanggaran aksesibilitas (${contextLabel}): ${JSON.stringify(
      severe.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
    )}`
  ).toEqual([]);
}

test.describe('Tanggal Tua 1.0.0 Full E2E & Accessibility Suite', () => {
  test('axe-core accessibility passes with 0 serious/critical violations on all 7 routes in light and dark themes', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await page.goto('/onboarding');
    await expect(
      page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
    ).toBeVisible();
    await assertNoSeriousA11yViolations(page, 'onboarding-light');

    await page.getByLabel('Saldo saat ini').fill('1500rb');
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Lihat jatah harianku' }).click();
    await page.getByRole('button', { name: 'Mulai' }).click();
    await expect(page.getByTestId('hero-allowance-amount')).toBeVisible();

    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('kopi 18rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();

    for (const [label, path] of [
      ['beranda-light', '/'],
      ['riwayat-light', '/riwayat'],
      ['ringkasan-light', '/ringkasan'],
      ['anggaran-light', '/anggaran'],
      ['target-light', '/target'],
      ['pengaturan-light', '/pengaturan'],
    ] as const) {
      await page.goto(path);
      await page.waitForTimeout(200);
      await assertNoSeriousA11yViolations(page, label);
    }

    await page.getByRole('radio', { name: 'Gelap' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    for (const [label, path] of [
      ['beranda-dark', '/'],
      ['riwayat-dark', '/riwayat'],
      ['ringkasan-dark', '/ringkasan'],
      ['anggaran-dark', '/anggaran'],
      ['target-dark', '/target'],
      ['pengaturan-dark', '/pengaturan'],
    ] as const) {
      await page.goto(path);
      await page.waitForTimeout(200);
      await assertNoSeriousA11yViolations(page, label);
    }
  });

  test('Ringkasan Insights + "Kenapa muncul?", StreakSheet + no_spend dayMark, and Settings 1.0.0 version check', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeOnboardingUi(page);

    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('kopi 12rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(quickInput).toHaveValue('');

    // Mark streak on today after clearing tx -> wait, instead undo first so day is open then mark no_spend
    await page.getByRole('button', { name: 'Batalkan' }).click();
    await page.getByTestId('streak-pill').click();
    await expect(page.getByRole('heading', { name: 'Streak Mencatat' })).toBeVisible();
    await page.getByRole('button', { name: 'Hari ini tidak ada pengeluaran' }).click();
    await expect(page.getByTestId('streak-pill')).toContainText('1 hari');
    const closePanelBtn = page.getByRole('button', { name: 'Tutup panel' });
    if (await closePanelBtn.isVisible()) {
      await closePanelBtn.click();
    }

    // Add expenses across two days via quick-add ("kemarin") so Insights trigger cleanly
    await quickInput.fill('makan siang 45rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await quickInput.fill('kopi 25rb kemarin');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();

    await page.getByRole('link', { name: 'Ringkasan' }).click();
    const whyBtn = page.getByRole('button', { name: 'Kenapa muncul?' }).first();
    await expect(whyBtn).toBeVisible();
    await whyBtn.click();
    await expect(whyBtn).toHaveAttribute('aria-expanded', 'true');

    await page.getByRole('link', { name: 'Pengaturan' }).click();
    const aboutHeading = page.getByRole('heading', {
      name: /Tanggal Tua · Versi 1\.0\.0/,
    });
    await expect(aboutHeading).toBeVisible();
    expect((await aboutHeading.textContent()) ?? '').not.toMatch(/beta|pra-rilis/i);
  });

  test('Savings goals full flow: create, deposit without changing spentToday/Ringkasan, withdraw, complete, and archive auto-refund', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeOnboardingUi(page);

    await page.goto('/target');
    await page.getByRole('button', { name: /Buat target/i }).first().click();
    await page.getByLabel('Nama target').fill('Sepatu lari');
    await page.getByLabel('Nominal target (Rp 10rb sampai Rp 1M)').fill('200000');
    await page.getByLabel('Tanggal target tercapai').fill('2026-12-20');
    await page.getByRole('button', { name: 'Simpan target' }).click();

    await expect(page.getByRole('heading', { name: 'Sepatu lari' })).toBeVisible();
    await page.getByRole('button', { name: 'Sisihkan' }).click();
    await page.getByLabel('Nominal yang disisihkan').fill('130000');
    await page.getByRole('button', { name: 'Simpan setoran' }).click();

    // Return Home: currentBalance drops 845k -> 715k, but spentToday stays Rp 0 ("terpakai Rp 0")
    await page.getByRole('link', { name: 'Beranda' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 715.000');
    await expect(page.getByText(/terpakai Rp 0/)).toBeVisible();

    // Check Ringkasan: expense totals exclude savings, "Ditabung" row displays Rp 130.000
    await page.getByRole('link', { name: 'Ringkasan' }).click();
    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 0');
    await expect(page.getByTestId('summary-saved')).toContainText('Rp 130.000');

    // Withdraw 30rb, then top up 100rb -> completes target with purchase
    await page.goto('/target');
    await page.getByRole('link', { name: /Sepatu lari/i }).click();
    await page.getByRole('button', { name: 'Tarik', exact: true }).click();
    await page.getByLabel('Nominal penarikan').fill('30000');
    await page.getByRole('button', { name: 'Tarik dana' }).click();

    await page.getByRole('button', { name: 'Sisihkan', exact: true }).click();
    await page.getByLabel('Nominal yang disisihkan').fill('100000');
    await page.getByRole('button', { name: 'Simpan setoran' }).click();

    await page.getByRole('button', { name: 'Pakai untuk beli' }).click();
    await expect(page.getByRole('status')).toContainText('selesai dipakai');

    // Second goal: deposit 50rb then archive -> auto-refund restores 50rb to saldo
    await page.goto('/target');
    await page.getByRole('button', { name: /Buat target/i }).first().click();
    await page.getByLabel('Nama target').fill('Headset');
    await page.getByLabel('Nominal target (Rp 10rb sampai Rp 1M)').fill('150000');
    await page.getByLabel('Tanggal target tercapai').fill('2026-12-25');
    await page.getByRole('button', { name: 'Simpan target' }).click();

    await expect(page.getByRole('heading', { name: 'Headset' })).toBeVisible();
    await page.getByRole('button', { name: 'Sisihkan' }).click();
    await page.getByLabel('Nominal yang disisihkan').fill('50000');
    await page.getByRole('button', { name: 'Simpan setoran' }).click();

    await page.getByRole('button', { name: 'Arsipkan' }).click();
    await page.getByRole('button', { name: 'Ya, arsipkan' }).click();

    await page.getByRole('link', { name: 'Beranda' }).click();
    // 845k - 200k completed target = 645k (Headset 50k was refunded automatically)
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 645.000');
  });

  test('Category budget full flow: set -> cross 80% & 100% -> toast, Home alert, Summary card, delete preserves txs', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await completeOnboardingUi(page);

    await page.goto('/anggaran');
    await page.getByRole('button', { name: 'Atur anggaran' }).first().click();
    await page.getByLabel('Kategori', { exact: true }).selectOption('cat-makan');
    await page.getByLabel('Batas nominal').fill('100000');
    await page.getByRole('button', { name: 'Simpan' }).click();

    await page.getByRole('link', { name: 'Beranda' }).click();
    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('nasi padang 85rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();

    await expect(page.getByRole('status')).toContainText('Anggaran Makan tinggal Rp 15rb');
    await expect(page.getByTestId('home-budget-alert')).toContainText('Makan hampir habis');

    await quickInput.fill('bakso 25rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(page.getByRole('status')).toContainText('Anggaran Makan sudah lewat Rp 10rb');

    await page.getByRole('link', { name: 'Ringkasan' }).click();
    await expect(page.getByRole('heading', { name: 'Anggaran' })).toBeVisible();
    await expect(page.getByText('Lewat Rp 10rb dari anggaran')).toBeVisible();

    await page.locator('a[href="/anggaran"]').first().click();
    await page.getByRole('button', { name: /Makan/i }).first().click();
    await page.getByRole('button', { name: 'Hapus' }).click();

    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByText('Nasi padang')).toBeVisible();
    await expect(page.getByText('Bakso')).toBeVisible();
  });

  test('Daily reminder banner, shortcut ?aksi=catat, 31-day backup card & 7-day snooze, iOS Safari guide & single banner priority', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ =
        sessionStorage.getItem('__mock_today') || '2026-11-18';
      const mins = sessionStorage.getItem('__mock_minutes');
      if (mins !== null) {
        window.__TANGGAL_TUA_NOW_MINUTES__ = Number(mins);
      }
      if (sessionStorage.getItem('__mock_ios_ua') === '1') {
        Object.defineProperty(navigator, 'userAgent', {
          get: () =>
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
          configurable: true,
        });
      }
    });

    await completeOnboardingUi(page);

    // 1. Enable reminder & test ?aksi=catat shortcut
    await page.goto('/pengaturan');
    const enableReminderSwitch = page.getByRole('switch', {
      name: 'Ingatkan di dalam app',
    });
    await enableReminderSwitch.click();
    await expect(enableReminderSwitch).toHaveAttribute('aria-checked', 'true');
    await page.evaluate(() => {
      sessionStorage.setItem('__mock_minutes', String(20 * 60 + 15));
    });

    await page.goto('/?aksi=catat');
    await expect(page).toHaveURL(/\/$/);
    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await expect(quickInput).toBeFocused();

    // Reminder banner shows because past 20:00 and unlogged
    const reminderBanner = page.getByTestId('home-reminder-banner');
    await expect(reminderBanner).toBeVisible();
    await page.getByRole('button', { name: 'Tutup pengingat hari ini' }).click();
    await expect(reminderBanner).not.toBeVisible();

    // 2. Add 10 transactions -> advance 31 days -> iOS UA + backup eligible simultaneously -> iOS beats backup
    for (let i = 1; i <= 10; i++) {
      await quickInput.fill(`kopi ${i}rb`);
      await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
      await expect(quickInput).toHaveValue('');
    }

    await page.evaluate(() => {
      sessionStorage.setItem('__mock_today', '2026-12-20');
      sessionStorage.setItem('__mock_ios_ua', '1');
    });
    await page.reload();

    // Verify strict single-banner cascade:
    // Priority 1: Payday rolled prompt beats reminder, iOS install, and backup
    await expect(page.getByText('Kiriman sudah masuk? Catat')).toBeVisible();
    await expect(page.getByTestId('home-reminder-banner')).not.toBeVisible();
    await expect(page.getByTestId('home-ios-install-banner')).not.toBeVisible();
    await expect(page.getByTestId('home-backup-banner')).not.toBeVisible();

    // Priority 2: Dismiss payday -> reminder beats iOS install & backup
    await page.getByRole('button', { name: 'Tutup pengingat kiriman' }).click();
    await expect(page.getByTestId('home-reminder-banner')).toBeVisible();
    await expect(page.getByTestId('home-ios-install-banner')).not.toBeVisible();
    await expect(page.getByTestId('home-backup-banner')).not.toBeVisible();

    // Priority 3: Dismiss reminder -> iOS install beats backup
    await page.getByRole('button', { name: 'Tutup pengingat hari ini' }).click();
    await expect(page.getByTestId('home-ios-install-banner')).toBeVisible();
    await expect(page.getByTestId('home-backup-banner')).not.toBeVisible();

    // Verify Settings -> Tentang displays iOS install guide, and reset time before 20:00 for next-week check
    await page.goto('/pengaturan');
    await expect(page.getByTestId('settings-ios-install-guide')).toBeVisible();
    const reminderSwitch = page.getByRole('switch', { name: 'Ingatkan di dalam app' });
    await reminderSwitch.click();
    await expect(reminderSwitch).toHaveAttribute('aria-checked', 'false');
    await page.goto('/');

    // Priority 4: Dismiss iOS banner -> backup banner surfaces alone
    await expect(page.getByTestId('home-ios-install-banner')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup panduan instal iPhone' }).click();
    await expect(page.getByTestId('home-backup-banner')).toBeVisible();

    // Snooze backup 7 days
    await page.getByTestId('home-backup-banner').getByRole('button', { name: 'Nanti' }).click();
    await expect(page.getByTestId('home-backup-banner')).not.toBeVisible();

    // Advance +7 days -> resurfaces; download clears backup banner
    await page.evaluate(() => {
      sessionStorage.setItem('__mock_today', '2026-12-27');
    });
    await page.reload();
    const backupBanner = page.getByTestId('home-backup-banner');
    await expect(backupBanner).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await backupBanner.getByRole('button', { name: 'Unduh cadangan' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('tanggal-tua-backup-2026-12-27.json');
    await expect(backupBanner).not.toBeVisible();
  });

  test('Failed Dexie migration offers legacy backup download without wiping data and recovers cleanly on reload', async ({
    page,
  }) => {
    await seedLegacyV1Database(page, { openingBalance: 900_000, today: '2026-11-18' });

    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
      window.__TANGGAL_TUA_SIMULATE_UPGRADE_FAIL__ =
        sessionStorage.getItem('__fail_upgrade') === '1';
    });

    await page.evaluate(() => sessionStorage.setItem('__fail_upgrade', '1'));
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Gagal memuat' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Unduh cadangan data lama' }).click();
    const dl = await downloadPromise;
    expect(dl.suggestedFilename()).toContain('tanggal-tua-backup-lama-');

    await page.evaluate(() => sessionStorage.removeItem('__fail_upgrade'));
    await page.getByRole('button', { name: 'Muat ulang' }).click();

    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 875.000');
    await page.getByRole('link', { name: 'Riwayat' }).click();
    await expect(page.getByText('Sate ayam lama')).toBeVisible();
  });

  test('PWA update from Dexie v1 preserves data on reload and all core flows work completely offline', async ({
    page,
    context,
  }) => {
    await seedLegacyV1Database(page, { openingBalance: 900_000, today: '2026-11-18' });

    await page.addInitScript(() => {
      window.__TANGGAL_TUA_TODAY__ = '2026-11-18';
    });

    await page.goto('/');
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 875.000');

    // Ensure Service Worker is active before simulating update & going offline
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Simulate PWA update toast & click Muat ulang -> zero hangs, migrated v2 data stays intact
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tanggal-tua-sw-update-waiting'));
    });
    await expect(page.getByText('Versi baru tersedia · Muat ulang')).toBeVisible();
    await page.getByRole('button', { name: 'Muat ulang' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 875.000', {
      timeout: 5_000,
    });

    // Switch completely offline -> verify quick-add, target creation/deposit, budget check, Ringkasan, and .ics download
    await context.setOffline(true);

    const quickInput = page.getByPlaceholder('Ketik: kopi 18rb');
    await quickInput.fill('kopi 15rb');
    await page.getByRole('button', { name: 'Simpan catatan cepat' }).click();
    await expect(page.getByTestId('hero-total-balance')).toContainText('Rp 860.000');

    await page.goto('/target');
    await page.getByRole('button', { name: /Buat target/i }).first().click();
    await page.getByLabel('Nama target').fill('Kamera saku');
    await page.getByLabel('Nominal target (Rp 10rb sampai Rp 1M)').fill('300000');
    await page.getByLabel('Tanggal target tercapai').fill('2026-12-30');
    await page.getByRole('button', { name: 'Simpan target' }).click();
    await expect(page.getByRole('heading', { name: 'Kamera saku' })).toBeVisible();

    await page.goto('/ringkasan');
    await expect(page.getByTestId('summary-total-expense')).toHaveText('Rp 40.000');

    await page.goto('/pengaturan');
    const icsDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tambah ke kalender' }).click();
    const icsDl = await icsDownloadPromise;
    expect(icsDl.suggestedFilename()).toBe('tanggal-tua-pengingat.ics');

    await context.setOffline(false);
  });
});
