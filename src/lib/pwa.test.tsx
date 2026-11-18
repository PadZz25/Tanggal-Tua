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
});
