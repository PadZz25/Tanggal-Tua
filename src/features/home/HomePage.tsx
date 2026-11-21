import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/brand/Wordmark';
import { InstallPwaButton } from '../../components/ui/InstallPwaButton';
import { Sheet } from '../../components/ui/Sheet';
import { createTemplate } from '../../data/repositories/templates';
import { isValidAmount, parseNominalInput } from '../../domain/money';
import { getSelectableCategories } from '../../domain/parser/keywords';
import type { AppLiveState } from '../../hooks/useHomeState';
import { useUIStore } from '../../hooks/useUIStore';
import { HeroCard } from './HeroCard';
import { QuickAddBar } from './QuickAddBar';
import { QuickChips } from './QuickChips';
import { TodayList } from './TodayList';

interface HomePageProps {
  live: AppLiveState;
}

export function HomePage({ live }: HomePageProps) {
  const navigate = useNavigate();
  const openTransactionSheet = useUIStore((s) => s.openTransactionSheet);

  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [tplLabel, setTplLabel] = useState('');
  const [tplAmountRaw, setTplAmountRaw] = useState('');
  const [tplCategoryId, setTplCategoryId] = useState('cat-jajan');
  const [tplError, setTplError] = useState<string | null>(null);

  const expenseCategories = getSelectableCategories(live.categories, 'expense');

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = tplLabel.trim();
    if (!trimmedLabel) {
      setTplError('Nama template wajib diisi, mis. Kopi kampus');
      return;
    }

    const parsedAmount = parseNominalInput(tplAmountRaw);
    if (!parsedAmount || !isValidAmount(parsedAmount)) {
      setTplError('Masukkan nominal yang wajar, mis. 12rb atau 12000');
      return;
    }

    await createTemplate({
      label: trimmedLabel,
      amount: parsedAmount,
      categoryId: tplCategoryId,
    });

    setTplLabel('');
    setTplAmountRaw('');
    setTplError(null);
    setIsAddTemplateOpen(false);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-2">
        <Wordmark mood={live.homeState.mood} asHeading />
        <div className="flex items-center gap-2">
          <InstallPwaButton variant="compact" />
          <button
            type="button"
            onClick={() => openTransactionSheet({ defaultType: 'expense' })}
            aria-label="Tambah transaksi lengkap"
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] transition-colors hover:bg-[var(--border-soft)] active:scale-95"
          >
            <Plus size={20} strokeWidth={2.3} aria-hidden="true" />
          </button>
        </div>
      </header>

      <HeroCard
        today={live.today}
        nextPayday={live.settings.nextPayday}
        homeState={live.homeState}
        onConfigurePayday={() => navigate('/pengaturan')}
        onRecordIncome={() => openTransactionSheet({ defaultType: 'income' })}
      />

      <QuickChips
        templates={live.topTemplates}
        today={live.today}
        onAddTemplateClick={() => {
          setTplError(null);
          setIsAddTemplateOpen(true);
        }}
      />

      <TodayList
        transactions={live.todayTransactions}
        categoryMap={live.categoryMap}
        onSelectTransaction={(tx) => openTransactionSheet({ transactionId: tx.id })}
      />

      <QuickAddBar
        today={live.today}
        openingDate={live.settings.openingDate}
        categories={live.categories}
        categoryMap={live.categoryMap}
      />

      <Sheet
        open={isAddTemplateOpen}
        onClose={() => setIsAddTemplateOpen(false)}
        title="Tambah Template Cepat"
      >
        <form onSubmit={(e) => void handleCreateTemplate(e)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="tpl-label-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nama pengeluaran
            </label>
            <input
              id="tpl-label-input"
              type="text"
              value={tplLabel}
              onChange={(e) => {
                setTplLabel(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: Kopi susu"
              maxLength={40}
              required
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="tpl-amount-input"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Nominal (Rupiah)
            </label>
            <input
              id="tpl-amount-input"
              type="text"
              inputMode="numeric"
              value={tplAmountRaw}
              onChange={(e) => {
                setTplAmountRaw(e.target.value);
                if (tplError) setTplError(null);
              }}
              placeholder="Contoh: 15rb atau 15000"
              required
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            />
          </div>

          <div>
            <label
              htmlFor="tpl-category-select"
              className="mb-1 block text-[13px] font-bold text-[var(--ink)]"
            >
              Kategori
            </label>
            <select
              id="tpl-category-select"
              value={tplCategoryId}
              onChange={(e) => setTplCategoryId(e.target.value)}
              className="min-h-[48px] w-full rounded-[16px] border border-[var(--border-control)] bg-[var(--bg)] px-3.5 text-[16px] font-semibold text-[var(--ink)]"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {tplError && (
            <p role="alert" className="text-[13px] font-bold text-[var(--warm-ink)]">
              {tplError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddTemplateOpen(false)}
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
              Simpan template
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
