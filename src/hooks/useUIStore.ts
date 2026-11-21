import { create } from 'zustand';
import type { TransactionType } from '../domain/types';

export interface ToastItem {
  id: string;
  message: string;
  undoLabel?: string;
  onUndo?: () => Promise<void> | void;
  onExpire?: () => Promise<void> | void;
}

interface UIStoreState {
  toast: ToastItem | null;
  pendingDeleteIds: string[];
  isTransactionSheetOpen: boolean;
  editingTransactionId: string | null;
  defaultTransactionType: TransactionType;
  mascotReactionTick: number;
  paydayRolledBanner: boolean;
  showToast: (item: Omit<ToastItem, 'id'>) => void;
  dismissToast: (runExpire?: boolean) => Promise<void>;
  triggerUndo: () => Promise<void>;
  addPendingDelete: (id: string) => void;
  removePendingDelete: (id: string) => void;
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
  pendingDeleteIds: [],
  isTransactionSheetOpen: false,
  editingTransactionId: null,
  defaultTransactionType: 'expense',
  mascotReactionTick: 0,
  paydayRolledBanner: false,

  showToast: (item) => {
    const prev = get().toast;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (prev?.onExpire) {
      void prev.onExpire();
    }

    const id = crypto.randomUUID();
    set({ toast: { ...item, id } });

    toastTimer = setTimeout(() => {
      const current = get().toast;
      if (current && current.id === id) {
        void get().dismissToast(true);
      }
    }, 5_000);
  },

  dismissToast: async (runExpire = true) => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    const current = get().toast;
    set({ toast: null });
    if (runExpire && current?.onExpire) {
      await current.onExpire();
    }
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

  addPendingDelete: (id) =>
    set((state) => ({
      pendingDeleteIds: state.pendingDeleteIds.includes(id)
        ? state.pendingDeleteIds
        : [...state.pendingDeleteIds, id],
    })),

  removePendingDelete: (id) =>
    set((state) => ({
      pendingDeleteIds: state.pendingDeleteIds.filter((item) => item !== id),
    })),

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
