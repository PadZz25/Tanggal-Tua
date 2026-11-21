import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 4176;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve(process.cwd(), 'docs/screenshots');
const TODAY = '2026-11-22';

function resolveChromiumExecutable() {
  const defaultPath = chromium.executablePath();
  if (defaultPath && fs.existsSync(defaultPath)) {
    return defaultPath;
  }
  const localCache =
    'C:/Users/Fadlyz/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe';
  if (fs.existsSync(localCache)) {
    return localCache;
  }
  return undefined;
}

async function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not start within ${timeoutMs}ms`);
}

async function seedFictionalData(page) {
  await page.evaluate(async (today) => {
    const req = indexedDB.open('tanggal-tua-db');
    const db = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction(
      ['transactions', 'budgets', 'goals', 'dayMarks', 'settings'],
      'readwrite'
    );
    const txDone = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });

    const txStore = tx.objectStore('transactions');
    txStore.clear();
    const budgetStore = tx.objectStore('budgets');
    budgetStore.clear();
    const goalStore = tx.objectStore('goals');
    goalStore.clear();
    const markStore = tx.objectStore('dayMarks');
    markStore.clear();

    const nowIso = `${today}T12:00:00.000Z`;
    const sampleTxs = [
      {
        id: 'demo-tx-1',
        type: 'expense',
        amount: 22000,
        categoryId: 'cat-makan',
        note: 'Nasi ayam geprek',
        date: '2026-11-16',
        createdAt: '2026-11-16T12:15:00.000Z',
        updatedAt: '2026-11-16T12:15:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-2',
        type: 'expense',
        amount: 68000,
        categoryId: 'cat-makan',
        note: 'Stok lauk dan sayur mingguan',
        date: '2026-11-17',
        createdAt: '2026-11-17T18:00:00.000Z',
        updatedAt: '2026-11-17T18:00:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-3',
        type: 'expense',
        amount: 24000,
        categoryId: 'cat-jajan',
        note: 'Kopi susu gula aren',
        date: '2026-11-18',
        createdAt: '2026-11-18T14:20:00.000Z',
        updatedAt: '2026-11-18T14:20:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-4',
        type: 'expense',
        amount: 35000,
        categoryId: 'cat-transport',
        note: 'Bensin motor',
        date: '2026-11-19',
        createdAt: '2026-11-19T08:10:00.000Z',
        updatedAt: '2026-11-19T08:10:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-5',
        type: 'expense',
        amount: 75000,
        categoryId: 'cat-makan',
        note: 'Makan malam bareng',
        date: '2026-11-20',
        createdAt: '2026-11-20T19:30:00.000Z',
        updatedAt: '2026-11-20T19:30:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-6',
        type: 'expense',
        amount: 42000,
        categoryId: 'cat-jajan',
        note: 'Martabak manis',
        date: '2026-11-21',
        createdAt: '2026-11-21T20:10:00.000Z',
        updatedAt: '2026-11-21T20:10:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-7',
        type: 'expense',
        amount: 18000,
        categoryId: 'cat-makan',
        note: 'Warteg Bu Tini',
        date: today,
        createdAt: `${today}T12:15:00.000Z`,
        updatedAt: `${today}T12:15:00.000Z`,
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-8',
        type: 'expense',
        amount: 15000,
        categoryId: 'cat-jajan',
        note: 'Es kopi kampus',
        date: today,
        createdAt: `${today}T14:40:00.000Z`,
        updatedAt: `${today}T14:40:00.000Z`,
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-9',
        type: 'expense',
        amount: 2000,
        categoryId: 'cat-transport',
        note: 'Parkir',
        date: today,
        createdAt: `${today}T15:05:00.000Z`,
        updatedAt: `${today}T15:05:00.000Z`,
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-prev-1',
        type: 'expense',
        amount: 140000,
        categoryId: 'cat-paketan',
        note: 'Paket data bulanan',
        date: '2026-11-11',
        createdAt: '2026-11-11T09:00:00.000Z',
        updatedAt: '2026-11-11T09:00:00.000Z',
        source: 'form',
        goalId: null,
      },
      {
        id: 'demo-tx-prev-2',
        type: 'expense',
        amount: 95000,
        categoryId: 'cat-makan',
        note: 'Makan minggu lalu',
        date: '2026-11-12',
        createdAt: '2026-11-12T12:00:00.000Z',
        updatedAt: '2026-11-12T12:00:00.000Z',
        source: 'quick',
        goalId: null,
      },
      {
        id: 'demo-tx-goal-1',
        type: 'expense',
        amount: 350000,
        categoryId: 'cat-tabungan',
        note: 'Sisihkan Laptop kuliah',
        date: '2026-11-15',
        createdAt: '2026-11-15T10:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
        source: 'form',
        goalId: 'demo-goal-laptop',
      },
    ];

    for (const item of sampleTxs) {
      txStore.put({ ...item, occurredAt: item.createdAt });
    }

    goalStore.put({
      id: 'demo-goal-laptop',
      name: 'Laptop kuliah',
      targetAmount: 1000000,
      startDate: '2026-11-01',
      deadline: '2027-02-28',
      status: 'active',
      lastMilestone: 25,
      createdAt: '2026-11-01T08:00:00.000Z',
    });
    goalStore.put({
      id: 'demo-goal-darurat',
      name: 'Dana darurat',
      targetAmount: 500000,
      startDate: '2026-11-01',
      deadline: '2027-01-31',
      status: 'active',
      lastMilestone: 0,
      createdAt: '2026-11-02T08:00:00.000Z',
    });

    budgetStore.put({
      categoryId: 'cat-makan',
      period: 'week',
      amount: 170000,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    budgetStore.put({
      categoryId: 'cat-jajan',
      period: 'week',
      amount: 95000,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    budgetStore.put({
      categoryId: 'cat-transport',
      period: 'week',
      amount: 120000,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    markStore.put({
      date: '2026-11-19',
      kind: 'no_spend',
      createdAt: '2026-11-19T21:00:00.000Z',
    });

    const settingsStore = tx.objectStore('settings');
    const getSettingsReq = settingsStore.get('main');
    getSettingsReq.onsuccess = () => {
      const cur = getSettingsReq.result || {};
      settingsStore.put({
        ...cur,
        id: 'main',
        hasOnboarded: true,
        openingBalance: 1650000,
        openingDate: '2026-11-01',
        nextPayday: '2026-12-01',
        paydayDay: 1,
        paydayRepeat: 'monthly',
        paydayWeekday: null,
        theme: 'light',
        reminderEnabled: false,
        reminderTime: '20:00',
        lastCelebratedStreak: 0,
        backupSnoozeUntil: null,
        iosHintDismissed: false,
        lastExportAt: '2026-11-12T09:00:00.000Z',
        currency: 'IDR',
      });
    };

    await txDone;
    db.close();
  }, TODAY);
}

async function patchSettings(page, patch) {
  await page.evaluate(async (p) => {
    const req = indexedDB.open('tanggal-tua-db');
    const db = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['settings'], 'readwrite');
    const txDone = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
    const store = tx.objectStore('settings');
    const getReq = store.get('main');
    getReq.onsuccess = () => {
      store.put({ ...(getReq.result || {}), ...p });
    };
    await txDone;
    db.close();
  }, patch);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const previewProc = spawn(
    process.execPath,
    [
      path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { stdio: 'pipe' }
  );

  let browser;
  try {
    await waitForServer(BASE_URL);
    const executablePath = resolveChromiumExecutable();
    browser = await chromium.launch(executablePath ? { executablePath } : {});
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error('PAGEERROR:', err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CONSOLE:', msg.text());
    });

    await page.addInitScript((fixedToday) => {
      window.__TANGGAL_TUA_TODAY__ = fixedToday;
    }, TODAY);

    await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'networkidle' });
    await page.getByLabel('Saldo saat ini').fill('1250rb');
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Lihat jatah harianku' }).click();
    await page.getByRole('button', { name: 'Mulai' }).click();
    await page.getByTestId('hero-allowance-amount').waitFor();

    await seedFictionalData(page);

    // 1. Beranda Terang
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('hero-allowance-amount').waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT_DIR, 'beranda-terang.png') });

    // 2. Beranda Gelap
    await patchSettings(page, { theme: 'dark' });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('hero-allowance-amount').waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT_DIR, 'beranda-gelap.png') });

    // 3. Beranda Tanggal Tua (light, <=20% daily allowance left -> Mode Tanggal Tua warm terracotta hero)
    await patchSettings(page, { theme: 'light', openingBalance: 1235000 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('hero-allowance-amount').waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT_DIR, 'beranda-tanggal-tua.png') });

    // Restore comfortable balance for remaining screens
    await patchSettings(page, { theme: 'light', openingBalance: 1650000 });

    // 4. Ringkasan
    await page.goto(`${BASE_URL}/ringkasan`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Ringkasan' }).waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT_DIR, 'ringkasan.png') });

    // 5. Anggaran
    await page.goto(`${BASE_URL}/anggaran`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Anggaran', exact: true }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'anggaran.png') });

    // 6. Target
    await page.goto(`${BASE_URL}/target`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Target Tabungan' }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'target.png') });

    // 7. Pengaturan
    await page.goto(`${BASE_URL}/pengaturan`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Pengaturan' }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT_DIR, 'pengaturan.png') });

    console.log('Screenshots captured successfully in', OUT_DIR);
  } finally {
    if (browser) await browser.close();
    previewProc.kill();
  }
}

await main();
