import { expect, type Page } from '@playwright/test';

/**
 * Ensures no runtime request ever leaves the local app origin.
 */
export function attachZeroThirdPartyGuard(page: Page): () => void {
  const disallowedUrls: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('about:')
    ) {
      return;
    }
    try {
      const parsed = new URL(url);
      const isLocal =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (!isLocal) {
        disallowedUrls.push(url);
      }
    } catch {
      disallowedUrls.push(url);
    }
  });

  return () => {
    expect(
      disallowedUrls,
      `Permintaan jaringan pihak ketiga terdeteksi: ${disallowedUrls.join(', ')}`
    ).toEqual([]);
  };
}

export async function completeOnboardingUi(
  page: Page,
  options: { balanceText?: string; expectedAllowance?: string } = {}
): Promise<void> {
  const balanceText = options.balanceText ?? '845rb';
  const expectedAllowance = options.expectedAllowance ?? 'Rp 65rb';
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Uang yang kamu pegang sekarang berapa?' })
  ).toBeVisible();
  await page.getByLabel('Saldo saat ini').fill(balanceText);
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

/**
 * Seeds a realistic legacy v0.3.1 IndexedDB database (Dexie version 1 -> IDB version 10)
 * before launching the v1.0.0 application so upgrade/fallback paths are tested authentically.
 */
export async function seedLegacyV1Database(
  page: Page,
  options: { openingBalance?: number; today?: string } = {}
): Promise<void> {
  const openingBalance = options.openingBalance ?? 900_000;
  const baseDate = options.today ?? '2026-11-18';
  await page.goto('/manifest.webmanifest');

  await page.evaluate(
    async ({ balance, dateStr }) => {
      await new Promise<void>((resolve, reject) => {
        const del = indexedDB.deleteDatabase('tanggal-tua-db');
        del.onsuccess = () => resolve();
        del.onerror = () => reject(del.error);
        del.onblocked = () => resolve();
      });

      await new Promise<void>((resolve, reject) => {
        const openReq = indexedDB.open('tanggal-tua-db', 10);
        openReq.onupgradeneeded = () => {
          const db = openReq.result;
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('date', 'date', { unique: false });
          txStore.createIndex('type', 'type', { unique: false });
          txStore.createIndex('categoryId', 'categoryId', { unique: false });
          txStore.createIndex('createdAt', 'createdAt', { unique: false });

          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('kind', 'kind', { unique: false });
          catStore.createIndex('order', 'order', { unique: false });

          const tplStore = db.createObjectStore('templates', { keyPath: 'id' });
          tplStore.createIndex('order', 'order', { unique: false });

          db.createObjectStore('settings', { keyPath: 'id' });

          const pplStore = db.createObjectStore('people', { keyPath: 'id' });
          pplStore.createIndex('createdAt', 'createdAt', { unique: false });

          const debtStore = db.createObjectStore('debts', { keyPath: 'id' });
          debtStore.createIndex('personId', 'personId', { unique: false });
          debtStore.createIndex('direction', 'direction', { unique: false });
          debtStore.createIndex('createdAt', 'createdAt', { unique: false });
        };
        openReq.onsuccess = () => {
          const db = openReq.result;
          const tx = db.transaction(
            ['settings', 'categories', 'templates', 'transactions'],
            'readwrite'
          );
          tx.objectStore('settings').put({
            id: 'main',
            schemaVersion: 1,
            hasOnboarded: true,
            openingBalance: balance,
            openingDate: '2026-11-10',
            nextPayday: '2026-12-01',
            paydayRepeat: 'monthly',
            paydayDay: 1,
            paydayWeekday: null,
            tanggalTuaThreshold: 30000,
            theme: 'light',
            lastExportAt: null,
          });
          tx.objectStore('categories').put({
            id: 'cat-makan',
            kind: 'expense',
            name: 'Makan',
            icon: 'Utensils',
            tone: 'makan',
            keywords: ['makan', 'nasi', 'warteg'],
            order: 1,
            isDefault: true,
          });
          tx.objectStore('templates').put({
            id: 'tpl-kopi',
            label: 'Kopi',
            amount: 12000,
            categoryId: 'cat-makan',
            order: 1,
            usageCount: 3,
          });
          tx.objectStore('transactions').put({
            id: 'legacy-tx-1',
            type: 'expense',
            amount: 25000,
            categoryId: 'cat-makan',
            note: 'Sate ayam lama',
            date: dateStr,
            occurredAt: `${dateStr}T11:00:00.000Z`,
            source: 'quick',
            createdAt: `${dateStr}T11:00:00.000Z`,
            updatedAt: `${dateStr}T11:00:00.000Z`,
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        openReq.onerror = () => reject(openReq.error);
      });
    },
    { balance: openingBalance, dateStr: baseDate }
  );
}
