import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mascot } from '../../components/brand/Mascot';
import { Wordmark } from '../../components/brand/Wordmark';
import { HeroAmountText } from '../home/HeroCard';
import { InstallPwaButton } from '../../components/ui/InstallPwaButton';
import { PaydayScheduleControl } from '../../components/ui/PaydayScheduleControl';
import { completeOnboarding } from '../../data/repositories/settings';
import { computeAllowance } from '../../domain/allowance';
import {
  daysBetween,
  defaultNextPayday,
  getIsoWeekday,
  getNextWeeklyPayday,
  parseDateParts,
} from '../../domain/dates';
import {
  formatFull,
  formatHeroShort,
  isValidAmount,
  parseNominalInput,
} from '../../domain/money';
import type { PaydayRepeat, PaydayWeekday, ThemePreference } from '../../domain/types';
import { applyThemeToDocument } from '../../hooks/useTheme';

interface OnboardingPageProps {
  today: string;
  initialTheme?: ThemePreference;
}

const PRESET_AMOUNTS = [
  { label: '300rb', value: '300rb' },
  { label: '500rb', value: '500rb' },
  { label: '850rb', value: '850rb' },
  { label: '1,5jt', value: '1,5jt' },
] as const;

export function OnboardingPage({
  today,
  initialTheme = 'system',
}: OnboardingPageProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [nextPayday, setNextPayday] = useState(() => defaultNextPayday(today));
  const [paydayRepeat, setPaydayRepeat] = useState<PaydayRepeat>('monthly');
  const [paydayWeekday, setPaydayWeekday] = useState<PaydayWeekday>(() =>
    getIsoWeekday(today)
  );
  const [dateError, setDateError] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [isSaving, setIsSaving] = useState(false);

  const parsedBalance = parseNominalInput(balanceInput);
  const effectivePayday =
    paydayRepeat === 'weekly' ? getNextWeeklyPayday(today, paydayWeekday) : nextPayday;
  const daysLeft = Math.max(1, daysBetween(today, effectivePayday));

  const previewAllowance = computeAllowance({
    currentBalance: parsedBalance && isValidAmount(parsedBalance) ? parsedBalance : 0,
    spentToday: 0,
    daysLeft,
  });

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    if (parsedBalance === null || !isValidAmount(parsedBalance)) {
      setBalanceError('Masukkan nominal antara Rp 1 sampai Rp 1.000.000.000 (mis. 850rb)');
      return;
    }
    setBalanceError(null);
    setStep(2);
  };

  const handleRepeatChange = (nextMode: PaydayRepeat) => {
    setPaydayRepeat(nextMode);
    setDateError(null);
    if (nextMode === 'weekly') {
      setNextPayday(getNextWeeklyPayday(today, paydayWeekday));
    } else if (!nextPayday || daysBetween(today, nextPayday) <= 0) {
      setNextPayday(defaultNextPayday(today));
    }
  };

  const handleWeekdayChange = (day: PaydayWeekday) => {
    setPaydayWeekday(day);
    setNextPayday(getNextWeeklyPayday(today, day));
    setDateError(null);
  };

  const handleStep2Submit = (e: FormEvent) => {
    e.preventDefault();
    if (paydayRepeat !== 'weekly' && (!nextPayday || daysBetween(today, nextPayday) <= 0)) {
      setDateError('Pilih tanggal kiriman setelah hari ini');
      return;
    }
    if (paydayRepeat === 'weekly') {
      setNextPayday(getNextWeeklyPayday(today, paydayWeekday));
    }
    setDateError(null);
    setStep(3);
  };

  const handleThemeChange = (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
  };

  const handleFinish = async () => {
    if (!parsedBalance || !isValidAmount(parsedBalance) || isSaving) return;
    setIsSaving(true);
    const finalPayday =
      paydayRepeat === 'weekly' ? getNextWeeklyPayday(today, paydayWeekday) : nextPayday;
    const paydayDay = paydayRepeat === 'monthly' ? parseDateParts(finalPayday).day : null;
    await completeOnboarding({
      openingBalance: parsedBalance,
      openingDate: today,
      nextPayday: finalPayday,
      paydayRepeat,
      paydayDay,
      paydayWeekday: paydayRepeat === 'weekly' ? paydayWeekday : null,
      theme,
    });
    navigate('/', { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-between bg-[var(--bg)] px-5 py-6 text-[var(--ink)]">
      <div>
        <header className="flex items-center justify-between gap-2">
          <Wordmark mood="smile" />
          <div className="flex items-center gap-2.5">
            <InstallPwaButton variant="compact" />
            {step <= 3 && (
              <nav aria-label="Langkah persiapan">
                <ol className="flex items-center gap-1.5">
                  {[1, 2, 3].map((idx) => (
                    <li
                      key={idx}
                      aria-current={step === idx ? 'step' : undefined}
                      className={`h-2 rounded-full transition-all ${
                        step === idx
                          ? 'w-6 bg-[var(--primary)]'
                          : step > idx
                            ? 'w-2 bg-[var(--primary)] opacity-60'
                            : 'w-2 bg-[var(--border-control)] opacity-40'
                      }`}
                    >
                      <span className="visually-hidden">Langkah {idx} dari 3</span>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </header>

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="mt-10 space-y-5" noValidate>
            <div>
              <p className="text-[13px] font-bold text-[var(--muted)]">Langkah 1 dari 3</p>
              <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.5px]">
                Uang yang kamu pegang sekarang berapa?
              </h1>
              <p className="mt-1.5 text-[14px] text-[var(--muted)]">
                Gabungan uang tunai dan saldo e-wallet atau rekening yang siap dipakai sampai
                kiriman berikutnya.
              </p>
            </div>

            <div>
              <label
                htmlFor="onboarding-balance"
                className="mb-1.5 block text-[13px] font-bold text-[var(--ink)]"
              >
                Saldo saat ini
              </label>
              <input
                id="onboarding-balance"
                type="text"
                inputMode="text"
                autoFocus
                value={balanceInput}
                onChange={(e) => {
                  setBalanceInput(e.target.value);
                  if (balanceError) setBalanceError(null);
                }}
                placeholder="Contoh: 850rb atau 850000"
                aria-invalid={balanceError ? 'true' : undefined}
                className="min-h-[54px] w-full rounded-[20px] border border-[var(--border-control)] bg-[var(--surface)] px-4 text-[18px] font-extrabold text-[var(--ink)] placeholder:font-semibold placeholder:text-[var(--muted)]"
              />

              {parsedBalance !== null && isValidAmount(parsedBalance) && (
                <p className="mt-1.5 px-1 text-[13px] font-bold text-[var(--primary)]">
                  Terbaca: {formatFull(parsedBalance)}
                </p>
              )}

              {balanceError && (
                <p role="alert" className="mt-1.5 px-1 text-[13px] font-bold text-[var(--warm)]">
                  {balanceError}
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[12px] font-bold text-[var(--muted)]">Pilihan cepat:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setBalanceInput(item.value);
                      setBalanceError(null);
                    }}
                    className="min-h-[44px] rounded-[22px] border border-[var(--border-control)] bg-[var(--surface)] px-4 text-[14px] font-bold text-[var(--ink)] hover:bg-[var(--border-soft)]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="min-h-[52px] w-full rounded-[26px] text-[16px] font-extrabold transition-transform active:scale-98"
              >
                Lanjut
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="mt-10 space-y-5" noValidate>
            <div>
              <p className="text-[13px] font-bold text-[var(--muted)]">Langkah 2 dari 3</p>
              <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.5px]">
                Kiriman atau gajian berikutnya tanggal berapa?
              </h1>
              <p className="mt-1.5 text-[14px] text-[var(--muted)]">
                Kami membagi saldomu dengan jumlah hari sampai tanggal ini.
              </p>
            </div>

            <PaydayScheduleControl
              today={today}
              paydayRepeat={paydayRepeat}
              paydayWeekday={paydayWeekday}
              nextPayday={nextPayday}
              dateInputId="onboarding-payday"
              dateLabel="Tanggal kiriman berikutnya"
              dateError={dateError}
              onRepeatChange={handleRepeatChange}
              onWeekdayChange={handleWeekdayChange}
              onDateChange={(val) => {
                setNextPayday(val);
                if (dateError) setDateError(null);
              }}
            />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[52px] rounded-[26px] border border-[var(--border-control)] px-5 text-[15px] font-bold text-[var(--ink)]"
              >
                Kembali
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="min-h-[52px] flex-1 rounded-[26px] text-[16px] font-extrabold"
              >
                Lanjut
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="mt-10 space-y-5">
            <div>
              <p className="text-[13px] font-bold text-[var(--muted)]">
                Langkah 3 dari 3 (Opsional)
              </p>
              <h1 className="mt-1 text-[24px] font-extrabold leading-tight tracking-[-0.5px]">
                Pilih tema tampilan
              </h1>
              <p className="mt-1.5 text-[14px] text-[var(--muted)]">
                Kamu selalu bisa mengubahnya nanti di menu Pengaturan.
              </p>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="visually-hidden">Tema tampilan</legend>
              {(
                [
                  {
                    value: 'system',
                    title: 'Ikuti Sistem',
                    desc: 'Otomatis menyesuaikan mode terang atau gelap perangkatmu',
                  },
                  {
                    value: 'light',
                    title: 'Terang Hangat',
                    desc: 'Latar kertas krem yang terang dan nyaman di siang hari',
                  },
                  {
                    value: 'dark',
                    title: 'Gelap Tenang',
                    desc: 'Permukaan gelap hangat yang teduh di malam hari',
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  htmlFor={`theme-opt-${option.value}`}
                  className={`flex min-h-[64px] items-center gap-3.5 rounded-[20px] border p-4 transition-colors ${
                    theme === option.value
                      ? 'border-[var(--primary)] bg-[var(--primary-tint)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <input
                    id={`theme-opt-${option.value}`}
                    type="radio"
                    name="onboarding-theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => handleThemeChange(option.value)}
                    className="h-5 w-5"
                  />
                  <div>
                    <span className="block text-[15px] font-extrabold text-[var(--ink)]">
                      {option.title}
                    </span>
                    <span className="block text-[12px] font-medium text-[var(--muted)]">
                      {option.desc}
                    </span>
                  </div>
                </label>
              ))}
            </fieldset>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-[52px] rounded-[26px] border border-[var(--border-control)] px-5 text-[15px] font-bold text-[var(--ink)]"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="min-h-[52px] flex-1 rounded-[26px] text-[16px] font-extrabold"
              >
                Lihat jatah harianku
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <section className="mt-10 flex flex-col items-center text-center">
            <Mascot mood="smile" size={64} />
            <p className="mt-4 text-[14px] font-bold text-[var(--muted)]">Siap dimulai!</p>
            <h1 className="mt-1 text-[22px] font-extrabold text-[var(--ink)]">
              Jatah harianmu: {formatHeroShort(previewAllowance.dailyAllowance)}
            </h1>

            <div
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
              }}
              className="mt-5 w-full rounded-[28px] p-6"
            >
              <p className="text-[13px] font-semibold opacity-90">Boleh jajan hari ini</p>
              <p
                data-testid="onboarding-final-allowance"
                style={{ fontVariantNumeric: 'proportional-nums' }}
                className="mt-1 text-[48px] font-extrabold leading-none tracking-[-1.5px]"
              >
                <HeroAmountText
                  value={formatHeroShort(previewAllowance.dailyAllowance)}
                />
              </p>
              <p className="mt-2 text-[13px] font-medium opacity-90">
                Dari saldo {formatFull(parsedBalance ?? 0)} untuk {daysLeft} hari ke depan
              </p>
            </div>

            <div className="mt-6 flex w-full gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="min-h-[52px] rounded-[26px] border border-[var(--border-control)] px-5 text-[15px] font-bold text-[var(--ink)]"
              >
                Ubah
              </button>
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={isSaving}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
                className="min-h-[52px] flex-1 rounded-[26px] text-[16px] font-extrabold"
              >
                Mulai
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className="mt-8 text-center text-[12px] font-medium text-[var(--muted)]">
        Datamu hanya tersimpan di perangkat ini.
      </footer>
    </main>
  );
}
