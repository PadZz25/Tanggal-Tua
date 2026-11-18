import { Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { Sheet } from '../../components/ui/Sheet';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '../../data/repositories/transactions';
import {
  formatFull,
  formatShort,
  isValidAmount,
  parseNominalInput,
} from '../../domain/money';
import type { Category, Transaction } from '../../domain/types';
import { useUIStore } from '../../hooks/useUIStore';
import { triggerHaptic } from '../../lib/haptics';
import { requestPersistentStorage } from '../../lib/pwa';

interface TransactionSheetProps {
  today: string;
  openingDate: string;
  categories: Category[];
  transactions: Transaction[];
}

export function TransactionSheet({
  today,
  openingDate,
  categories,
  transactions,
}: TransactionSheetProps) {
  const isOpen = useUIStore((s) => s.isTransactionSheetOpen);
  const editingId = useUIStore((s) => s.editingTransactionId);
  const defaultType = useUIStore((s) => s.defaultTransactionType);
  const closeSheet = useUIStore((s) => s.closeTransactionSheet);
  const showToast = useUIStore((s) => s.showToast);
  const addPendingDelete = useUIStore((s) => s.addPendingDelete);
  const removePendingDelete = useUIStore((s) => s.removePendingDelete);
  const triggerMascotReaction = useUIStore((s) => s.triggerMascotReaction);

  const editingTx = editingId
    ? transactions.find((t) => t.id === editingId) ?? null
    : null;

  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [categoryId, setCategoryId] = useState('cat-makan');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.kind === txType);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (editingTx) {
      const normalizedType = editingTx.type === 'income' ? 'income' : 'expense';
      setTxType(normalizedType);
      setAmountInput(String(Math.abs(editingTx.amount)));
      setCategoryId(
        editingTx.categoryId ??
          (normalizedType === 'income' ? 'cat-kiriman-ortu' : 'cat-makan')
      );
      setNote(editingTx.note);
      setDate(editingTx.date);
    } else {
      const initialType = defaultType === 'income' ? 'income' : 'expense';
      setTxType(initialType);
      setAmountInput('');
      setCategoryId(initialType === 'income' ? 'cat-kiriman-ortu' : 'cat-makan');
      setNote('');
      setDate(today);
    }
  }, [isOpen, editingTx, defaultType, today]);

  const handleTypeSwitch = (nextType: 'expense' | 'income') => {
    setTxType(nextType);
    const matching = categories.filter((c) => c.kind === nextType);
    if (matching.length > 0 && !matching.some((c) => c.id === categoryId)) {
      setCategoryId(matching[0].id);
    }
  };

  const parsedAmount = parseNominalInput(amountInput);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (parsedAmount === null || !isValidAmount(parsedAmount)) {
      setErrorMsg('Masukkan nominal antara Rp 1 sampai Rp 1.000.000.000');
      return;
    }

    if (!date) {
      setErrorMsg('Tanggal transaksi wajib diisi');
      return;
    }

    if (date < openingDate) {
      setErrorMsg(`Tanggal tidak boleh sebelum tanggal mulai (${openingDate})`);
      return;
    }

    if (date > today) {
      setErrorMsg('Tanggal transaksi tidak boleh di masa depan');
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const finalNote =
      note.trim() ||
      selectedCategory?.name ||
      (txType === 'income' ? 'Pemasukan' : 'Pengeluaran');

    if (editingTx) {
      await updateTransaction(editingTx.id, {
        type: editingTx.type === 'adjustment' ? 'adjustment' : txType,
        amount:
          editingTx.type === 'adjustment' && editingTx.amount < 0
            ? -parsedAmount
            : parsedAmount,
        categoryId: editingTx.type === 'adjustment' ? null : categoryId,
        note: finalNote,
        date,
      });
      triggerHaptic(10);
      closeSheet();
      showToast({
        message: `Diperbarui · ${finalNote}`,
      });
    } else {
      const created = await createTransaction({
        type: txType,
        amount: parsedAmount,
        categoryId,
        note: finalNote,
        date,
        source: 'form',
      });
      triggerHaptic(10);
      triggerMascotReaction();
      void requestPersistentStorage();
      closeSheet();

      const signPrefix =
        txType === 'income'
          ? `+${formatShort(parsedAmount)}`
          : formatShort(-parsedAmount);

      showToast({
        message: `Tersimpan · ${created.note} ${signPrefix}`,
        onUndo: async () => {
          await deleteTransaction(created.id);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!editingTx) return;
    const targetTx = editingTx;
    addPendingDelete(targetTx.id);
    triggerHaptic(10);
    closeSheet();

    showToast({
      message: `Dihapus · ${targetTx.note}`,
      onUndo: () => {
        removePendingDelete(targetTx.id);
      },
      onExpire: async () => {
        await deleteTransaction(targetTx.id);
        removePendingDelete(targetTx.id);
      },
    });
  };

  return (
    <Sheet
      open={isOpen}
      onClose={closeSheet}
      title={editingTx ? 'Ubah Transaksi' : 'Tambah Transaksi'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {(!editingTx || editingTx.type !== 'adjustment') && (
          <div
            role="group"
            aria-label="Jenis transaksi"
            className="grid grid-cols-2 gap-1.5 rounded-[18px] border border-[var(--border)] bg-[var(--bg)] p-1"
          >
            <button
              type="button"
              aria-pressed={txType === 'expense'}
              onClick={() => handleTypeSwitch('expense')}
              className={`min-h-[44px] rounded-[14px] text-[14px] font-extrabold transition-colors ${
                txType === 'expense'
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--muted)]'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              aria-pressed={txType === 'income'}
              onClick={() => handleTypeSwitch('income')}
              className={`min-h-[44px] rounded-[14px] text-[14px] font-extrabold transition-colors ${
                txType === 'income'
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--muted)]'
              }`}
            >
              Pemasukan
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor="tx-sheet-amount"
            className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
          >
            Nominal
          </label>
          <input
            id="tx-sheet-amount"
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Contoh: 18000 atau 18rb"
            required
            className="min-h-[50px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[18px] font-extrabold text-[var(--ink)]"
          />
          {parsedAmount !== null && isValidAmount(parsedAmount) && (
            <p className="mt-1 text-[13px] font-bold text-[var(--primary)]">
              {formatFull(parsedAmount)}
            </p>
          )}
        </div>

        {(!editingTx || editingTx.type !== 'adjustment') && (
          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]">
              Kategori
            </span>
            <div
              role="group"
              aria-label="Pilih kategori"
              className="grid grid-cols-3 gap-2"
            >
              {filteredCategories.map((cat) => {
                const isSelected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex min-h-[56px] items-center gap-2 rounded-[16px] border p-2 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-tint)] font-extrabold'
                        : 'border-[var(--border)] bg-[var(--bg)] font-semibold hover:bg-[var(--border-soft)]'
                    }`}
                  >
                    <CategoryIcon iconName={cat.icon} tone={cat.tone} size={32} />
                    <span className="truncate text-[12px] text-[var(--ink)]">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tx-sheet-note"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Catatan (opsional, maks 80)
            </label>
            <input
              id="tx-sheet-note"
              type="text"
              maxLength={80}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Kopi susu kampus"
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="tx-sheet-date"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Tanggal
            </label>
            <input
              id="tx-sheet-date"
              type="date"
              min={openingDate}
              max={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              required
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[15px] font-semibold text-[var(--ink)]"
            />
          </div>
        </div>

        {errorMsg && (
          <p role="alert" className="text-[13px] font-bold text-[var(--warm)]">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {editingTx ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-[20px] border border-[var(--warm)] px-4 text-[14px] font-extrabold text-[var(--warm)] hover:opacity-90"
            >
              <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
              <span>Hapus</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSheet}
              className="min-h-[48px] rounded-[20px] border border-[var(--border-control)] px-4 text-[14px] font-bold text-[var(--ink)]"
            >
              Batal
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="min-h-[48px] rounded-[20px] px-5 text-[14px] font-extrabold"
            >
              Simpan
            </button>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
