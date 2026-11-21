import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { db } from '../data/db';
import {
  mergeWithDefaultSettings,
  normalizeSettings,
  resetAllData,
  updateSettings,
} from '../data/repositories/settings';
import { createTransaction, getAllTransactions } from '../data/repositories/transactions';
import { loadAppSnapshot } from './useHomeState';

describe('Loader & bootstrap resilience (Bug B)', () => {
  beforeEach(async () => {
    window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__ = false;
    window.__TANGGAL_TUA_BOOTSTRAP_TIMEOUT_MS__ = 5_000;
    await resetAllData('2026-11-18');
    window.history.pushState({}, '', '/');
  });

  it('resolves missing settings row to defaults instead of hanging on loading spinner', async () => {
    await db.settings.clear();
    const rowAfterClear = await db.settings.get('main');
    expect(rowAfterClear).toBeUndefined();

    const snapshot = await loadAppSnapshot('2026-11-18');
    expect(snapshot.hasSettingsRow).toBe(false);
    expect(snapshot.settings.id).toBe('main');
    expect(snapshot.settings.theme).toBe('system');
    expect(snapshot.settings.tanggalTuaThreshold).toBe(30_000);

    render(<App />);
    await waitFor(() => {
      expect(
        screen.queryByText('Memuat catatan jatah harianmu...')
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /Uang yang kamu pegang sekarang berapa\?/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('performs partial settings update and merges missing fields with defaults on read', async () => {
    // Write a partial row missing some fields
    await db.settings.put({
      id: 'main',
      hasOnboarded: true,
      openingBalance: 600_000,
    } as never);

    await updateSettings({ theme: 'dark' });
    const raw = await db.settings.get('main');
    const merged = mergeWithDefaultSettings(raw, '2026-11-18');

    expect(merged.hasOnboarded).toBe(true);
    expect(merged.openingBalance).toBe(600_000);
    expect(merged.theme).toBe('dark');
    expect(merged.tanggalTuaThreshold).toBe(30_000);
  });

  it('shows "Gagal memuat" recovery screen when DB is blocked and preserves IndexedDB on cache reset', async () => {
    const user = userEvent.setup();

    await createTransaction({
      type: 'expense',
      amount: 18_000,
      categoryId: 'cat-jajan',
      note: 'Kopi aman',
      date: '2026-11-18',
      source: 'quick',
    });

    window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__ = true;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Gagal memuat' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Reset cache aplikasi' })
      ).toBeInTheDocument();
    });

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Reset cache aplikasi' }));
    });

    // IndexedDB transactions must remain intact
    window.__TANGGAL_TUA_SIMULATE_DB_BLOCKED__ = false;
    const savedTxs = await getAllTransactions();
    expect(savedTxs).toHaveLength(1);
    expect(savedTxs[0].note).toBe('Kopi aman');
  });

  it('normalizes legacy settings rows without paydayRepeat/paydayWeekday safely', () => {
    const legacyMonthly = normalizeSettings(
      {
        id: 'main',
        hasOnboarded: true,
        paydayDay: 15,
      },
      '2026-11-18'
    );
    expect(legacyMonthly.paydayRepeat).toBe('monthly');
    expect(legacyMonthly.paydayDay).toBe(15);
    expect(legacyMonthly.paydayWeekday).toBeNull();

    const legacyNone = normalizeSettings(
      {
        id: 'main',
        hasOnboarded: true,
        paydayDay: null,
      },
      '2026-11-18'
    );
    expect(legacyNone.paydayRepeat).toBe('none');
    expect(legacyNone.paydayDay).toBeNull();
    expect(legacyNone.paydayWeekday).toBeNull();

    const weeklyRow = normalizeSettings(
      {
        id: 'main',
        hasOnboarded: true,
        nextPayday: '2026-11-28',
        paydayRepeat: 'weekly',
        paydayWeekday: 6,
        paydayDay: null,
      },
      '2026-11-21'
    );
    expect(weeklyRow.paydayRepeat).toBe('weekly');
    expect(weeklyRow.paydayWeekday).toBe(6);
    expect(weeklyRow.paydayDay).toBeNull();
  });
});
