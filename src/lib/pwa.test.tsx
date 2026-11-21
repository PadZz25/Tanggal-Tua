import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallPwaButton } from '../components/ui/InstallPwaButton';
import { PwaUpdateBanner } from '../components/ui/PwaUpdateBanner';
import { initPwaSupport } from './pwa';

describe('PWA install prompt & button (Android 16 support)', () => {
  beforeEach(() => {
    initPwaSupport();
  });

  it('opens installation guide sheet when native beforeinstallprompt is not yet queued', async () => {
    const user = userEvent.setup();
    render(<InstallPwaButton variant="compact" />);

    const installBtn = screen.getByRole('button', {
      name: /Instal aplikasi Tanggal Tua/i,
    });
    await user.click(installBtn);

    expect(
      screen.getByRole('heading', { name: 'Instal Aplikasi Tanggal Tua' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Cara Pasang di Android 16/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mengerti' }));
  });

  it('captures beforeinstallprompt event and triggers native prompt() on click, then hides on appinstalled', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.fn().mockResolvedValue(undefined);

    const fakeEvent = new Event('beforeinstallprompt');
    Object.assign(fakeEvent, {
      platforms: ['web', 'play'],
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });

    act(() => {
      window.dispatchEvent(fakeEvent);
    });

    render(<InstallPwaButton variant="compact" />);
    const installBtn = screen.getByRole('button', {
      name: /Instal aplikasi Tanggal Tua/i,
    });
    expect(installBtn).toBeInTheDocument();

    await user.click(installBtn);
    expect(promptSpy).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Instal aplikasi Tanggal Tua/i })
      ).not.toBeInTheDocument();
    });
  });

  it('displays "Versi baru tersedia · Muat ulang" toast when a new service worker version is waiting and reloads on click', async () => {
    const user = userEvent.setup();
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    render(<PwaUpdateBanner />);

    act(() => {
      window.dispatchEvent(new CustomEvent('tanggal-tua-sw-update-waiting'));
    });

    expect(
      await screen.findByText('Versi baru tersedia · Muat ulang')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Muat ulang' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('clears deferredPrompt after a dismissed prompt so second Instal tap opens install guide without error', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.fn().mockResolvedValue(undefined);

    const dismissedEvent = new Event('beforeinstallprompt');
    Object.assign(dismissedEvent, {
      platforms: ['web'],
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });

    act(() => {
      window.dispatchEvent(dismissedEvent);
    });

    render(<InstallPwaButton variant="compact" />);
    const installBtn = screen.getByRole('button', {
      name: /Instal aplikasi Tanggal Tua/i,
    });

    await user.click(installBtn);
    expect(promptSpy).toHaveBeenCalledTimes(1);

    await user.click(installBtn);
    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('heading', { name: 'Instal Aplikasi Tanggal Tua' })
    ).toBeInTheDocument();
  });

  it('detects iOS Safari user agents accurately while excluding Chrome/Firefox/WebViews', async () => {
    const { isIosSafari, checkPersistentStorage } = await import('./pwa');

    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        5
      )
    ).toBe(true);
    expect(
      isIosSafari(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        5
      )
    ).toBe(true);
    expect(
      isIosSafari(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1',
        5
      )
    ).toBe(false);
    expect(
      isIosSafari(
        'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        5
      )
    ).toBe(false);

    expect(typeof (await checkPersistentStorage())).toBe('boolean');
  });
});
