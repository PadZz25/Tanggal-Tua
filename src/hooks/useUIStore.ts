import { create } from 'zustand';
import type { TransactionType } from '../domain/types';

export interface ToastItem {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
}

interface UIStoreState {
  toast: ToastItem | null;
  isTransactionSheetOpen: boolean;
  editingTransactionId: string | null;
  defaultTransactionType: TransactionType;
  mascotReactionTick: number;
  paydayRolledBanner: boolean;
  showToast: (item: Omit<ToastItem, 'id'>) => void;
  dismissToast: () => void;
  triggerUndo: () => Promise<void>;
  openTransactionSheet: (options?: {
    transactionId?: string | null;
    defaultType?: TransactionType;
  }) => void;
  closeTransactionSheet: () => void;
  triggerMascotReaction: () => void;
  setPaydayRolledBanner: (visible: boolean) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUIStore = create<UIStoreState>((set, get) => ({
  toast: null,
  isTransactionSheetOpen: false,
  editingTransactionId: null,
  defaultTransactionType: 'expense',
  mascotReactionTick: 0,
  paydayRolledBanner: false,

  showToast: (item) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    const id = crypto.randomUUID();
    set({ toast: { ...item, id } });

    toastTimer = setTimeout(() => {
      const current = get().toast;
      if (current && current.id === id) {
        get().dismissToast();
      }
    }, 5_000);
  },

  dismissToast: () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    set({ toast: null });
  },

  triggerUndo: async () => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    const current = get().toast;
    set({ toast: null });
    if (current?.onUndo) {
      await current.onUndo();
    }
  },

  openTransactionSheet: (options) =>
    set({
      isTransactionSheetOpen: true,
      editingTransactionId: options?.transactionId ?? null,
      defaultTransactionType: options?.defaultType ?? 'expense',
    }),

  closeTransactionSheet: () =>
    set({
      isTransactionSheetOpen: false,
      editingTransactionId: null,
    }),

  triggerMascotReaction: () =>
    set((state) => ({ mascotReactionTick: state.mascotReactionTick + 1 })),

  setPaydayRolledBanner: (visible) => set({ paydayRolledBanner: visible }),
}));
