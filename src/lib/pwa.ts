import { useSyncExternalStore } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaStatusSnapshot {
  isStandalone: boolean;
  canPromptInstall: boolean;
  swRegistered: boolean;
  isSecure: boolean;
  waitingWorker: ServiceWorker | null;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let swRegistered = false;
let isStandalone = false;
let initialized = false;

const listeners = new Set<() => void>();

let currentSnapshot: PwaStatusSnapshot = {
  isStandalone: false,
  canPromptInstall: false,
  swRegistered: false,
  isSecure: true,
  waitingWorker: null,
};

function updateSnapshot(): void {
  const isSecure =
    typeof window !== 'undefined' ? Boolean(window.isSecureContext) : true;

  currentSnapshot = {
    isStandalone,
    canPromptInstall: deferredPrompt !== null,
    swRegistered,
    isSecure,
    waitingWorker,
  };

  for (const listener of listeners) {
    listener();
  }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const matchStandalone =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches);
  const iosStandalone =
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(matchStandalone || iosStandalone);
}

export function initPwaSupport(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  isStandalone = detectStandalone();
  updateSnapshot();

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', (e) => {
      isStandalone = e.matches;
      updateSnapshot();
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    isStandalone = detectStandalone();
    updateSnapshot();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isStandalone = true;
    updateSnapshot();
  });

  window.addEventListener('tanggal-tua-sw-update-waiting', () => {
    waitingWorker = {
      postMessage: (msg: { type?: string }) => {
        if (msg?.type === 'SKIP_WAITING') {
          window.location.reload();
        }
      },
    } as unknown as ServiceWorker;
    updateSnapshot();
  });

  if (import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        swRegistered = true;
        if (registration.waiting) {
          waitingWorker = registration.waiting;
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              waitingWorker = newWorker;
              updateSnapshot();
            }
          });
        });

        updateSnapshot();
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

export async function triggerNativePwaInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  // Chrome allows prompt() once per event, so clear before awaiting user choice
  deferredPrompt = null;
  updateSnapshot();
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
}

export function applyWaitingServiceWorker(): void {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function dismissWaitingServiceWorker(): void {
  waitingWorker = null;
  updateSnapshot();
}

function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPwaSnapshot(): PwaStatusSnapshot {
  return currentSnapshot;
}

export function usePwaStatus(): PwaStatusSnapshot {
  return useSyncExternalStore(subscribePwa, getPwaSnapshot, getPwaSnapshot);
}

export function isInAppWebView(ua?: string): boolean {
  const resolved = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!resolved) return false;
  return /(FBAN|FBAV|Instagram|Line\/|WhatsApp|Telegram|TikTok|wv\))/i.test(resolved);
}

/**
 * Detects Safari on iPhone, iPad, iPod, or touch-capable iPadOS desktop UA,
 * excluding third-party iOS browsers (Chrome/Firefox/Edge/Opera) and WebViews.
 */
export function isIosSafari(ua?: string, maxTouchPoints?: number): boolean {
  if (typeof navigator === 'undefined' && ua === undefined) return false;
  const resolvedUa = ua ?? (navigator.userAgent || '');
  if (!resolvedUa) return false;

  const touchPoints =
    maxTouchPoints ??
    (typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0);

  const isIosDevice =
    /iPhone|iPad|iPod/i.test(resolvedUa) ||
    (/Macintosh/i.test(resolvedUa) && touchPoints > 1);
  if (!isIosDevice) return false;

  if (
    /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(resolvedUa) ||
    isInAppWebView(resolvedUa)
  ) {
    return false;
  }

  return /Safari\//i.test(resolvedUa);
}

export async function resetApplicationCache(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch {
    // Ignore SW unregister errors
  }

  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
  } catch {
    // Ignore Cache Storage deletion errors
  }
}

export async function checkPersistentStorage(): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persisted === 'function'
    ) {
      return await navigator.storage.persisted();
    }
  } catch {
    // Ignore when storage API is restricted
  }
  return false;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      if (typeof navigator.storage.persisted === 'function') {
        const alreadyPersisted = await navigator.storage.persisted();
        if (alreadyPersisted) return true;
      }
      return await navigator.storage.persist();
    }
  } catch {
    // Ignore when storage API is restricted
  }
  return false;
}
