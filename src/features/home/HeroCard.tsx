import { useEffect, useRef, useState } from 'react';
import { Mascot } from '../../components/brand/Mascot';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { getMascotCopy, UI_STRINGS } from '../../domain/copy';
import { formatShortDate } from '../../domain/dates';
import { formatFull, formatHeroShort, formatSpokenRupiah } from '../../domain/money';
import type { HomeStateResult } from '../../domain/types';
import { useUIStore } from '../../hooks/useUIStore';

interface HeroCardProps {
  today: string;
  nextPayday: string;
  homeState: HomeStateResult;
  showPaydayBanner?: boolean;
  onConfigurePayday: () => void;
  onRecordIncome: () => void;
}

function useAnimatedAmount(target: number): number {
  const [displayValue, setDisplayValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    prevRef.current = target;

    if (startVal === target) {
      setDisplayValue(target);
      return;
    }

    const canAnimate =
      typeof window !== 'undefined' &&
      typeof window.requestAnimationFrame === 'function' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!canAnimate) {
      setDisplayValue(target);
      return;
    }

    const duration = 380;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [target]);

  return displayValue;
}

export function HeroAmountText({ value }: { value: string }) {
  const commaIndex = value.indexOf(',');
  if (commaIndex === -1) return <>{value}</>;
  return (
    <>
      {value.slice(0, commaIndex)}
      <span className="-mx-[0.06em] inline-block">,</span>
      {value.slice(commaIndex + 1)}
    </>
  );
}

export function HeroCard({
  today,
  nextPayday,
  homeState,
  showPaydayBanner = true,
  onConfigurePayday,
  onRecordIncome,
}: HeroCardProps) {
  const {
    state,
    mood,
    daysLeft,
    currentBalance,
    spentToday,
    dailyAllowance,
    remainingToday,
    usedRatio,
  } = homeState;

  const paydayRolledBanner = useUIStore((s) => s.paydayRolledBanner);
  const setPaydayRolledBanner = useUIStore((s) => s.setPaydayRolledBanner);
  const mascotCelebration = useUIStore((s) => s.mascotCelebration);

  const animatedRemaining = useAnimatedAmount(remainingToday);
  const isWarmState = state === 'tanggal-tua' || state === 'over';
  const shortPayday = formatShortDate(nextPayday);

  const chipText =
    state === 'tanggal-tua'
      ? `${shortPayday} · ${daysLeft} hari lagi`
      : `Kiriman ${shortPayday} · ${daysLeft} hari lagi`;

  const mascotMessage =
    mascotCelebration?.message ??
    getMascotCopy({
      state,
      today,
      remainingToday,
    });
  const displayMood = mascotCelebration?.mood ?? mood;

  return (
    <section
      aria-label="Ringkasan jatah harian"
      className="relative mt-2 overflow-hidden rounded-[28px]"
    >
      {!isWarmState && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 hidden h-44 w-44 rounded-full bg-[#4A5BD0] opacity-45 blur-[60px] [[data-theme=dark]_&]:block"
        />
      )}

      <div
        style={{
          backgroundColor: isWarmState ? 'var(--warm)' : 'var(--hero-bg)',
          color: 'var(--hero-ink)',
        }}
        className={`relative rounded-[28px] p-[18px] transition-colors duration-300 ${
          !isWarmState
            ? '[[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[rgba(169,180,255,0.28)] [[data-theme=dark]_&]:backdrop-blur-[24px]'
            : ''
        }`}
      >
        {showPaydayBanner && paydayRolledBanner && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-[16px] bg-[var(--coin)] px-3.5 py-2 text-[var(--coin-ink)]">
            <span className="text-[13px] font-bold">{UI_STRINGS.paydayPrompt}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPaydayRolledBanner(false);
                  onRecordIncome();
                }}
                className="min-h-[36px] rounded-full bg-[var(--coin-ink)] px-3 text-[12px] font-extrabold text-[var(--coin)]"
              >
                Catat
              </button>
              <button
                type="button"
                onClick={() => setPaydayRolledBanner(false)}
                aria-label="Tutup pengingat kiriman"
                className="min-h-[36px] px-2 text-[12px] font-bold underline"
              >
                Nanti
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {state === 'tanggal-tua' ? (
            <span
              style={{
                backgroundColor: 'var(--coin)',
                color: 'var(--coin-ink)',
              }}
              className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold"
            >
              {UI_STRINGS.heroBadgeTanggalTua}
            </span>
          ) : (
            <span className="text-[14px] font-semibold">
              {state === 'payday-needed'
                ? UI_STRINGS.remainingBalanceLabel
                : UI_STRINGS.heroLabelNormal}
            </span>
          )}

          {state !== 'payday-needed' && (
            <span
              style={{ backgroundColor: 'var(--hero-chip)' }}
              className="inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold"
            >
              {chipText}
            </span>
          )}
        </div>

        {state === 'payday-needed' ? (
          <div className="mt-2.5">
            <p
              data-testid="hero-balance-amount"
              className="tabular-nums text-[40px] font-extrabold leading-[1.1] tracking-[-1.2px]"
            >
              <span className="visually-hidden">
                {UI_STRINGS.remainingBalanceLabel} {formatSpokenRupiah(currentBalance)}
              </span>
              <span aria-hidden="true">{formatFull(currentBalance)}</span>
            </p>
            <p className="mt-1.5 text-[14px] font-medium opacity-95">
              Tanggal kiriman sudah tiba atau lewat. Atur tanggal berikutnya agar jatah harianmu
              terhitung lagi.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onConfigurePayday}
                style={{
                  backgroundColor: 'var(--coin)',
                  color: 'var(--coin-ink)',
                }}
                className="min-h-[44px] rounded-[22px] px-4 text-[14px] font-extrabold transition-transform active:scale-95"
              >
                {UI_STRINGS.setNextPaydayCta}
              </button>
              <button
                type="button"
                onClick={onRecordIncome}
                style={{ backgroundColor: 'var(--hero-chip)' }}
                className="min-h-[44px] rounded-[22px] px-4 text-[14px] font-bold text-white transition-transform active:scale-95"
              >
                {UI_STRINGS.recordIncomeCta}
              </button>
            </div>
          </div>
        ) : state === 'broke' ? (
          <div className="mt-2.5">
            <p
              data-testid="hero-allowance-amount"
              style={{ fontVariantNumeric: 'proportional-nums' }}
              className="text-[52px] font-extrabold leading-[1.08] tracking-[-2px]"
            >
              Rp 0
            </p>
            <p
              data-testid="hero-total-balance"
              className="mt-1 flex items-baseline gap-1.5"
            >
              <span className="visually-hidden">
                {UI_STRINGS.remainingBalanceLabel} {formatSpokenRupiah(currentBalance)}
              </span>
              <span
                aria-hidden="true"
                style={{ color: 'var(--hero-muted)' }}
                className="text-[13px] font-bold"
              >
                {UI_STRINGS.remainingBalanceLabel}
              </span>
              <span aria-hidden="true" className="tabular-nums text-[14px] font-extrabold">
                {formatFull(currentBalance)}
              </span>
            </p>
            <div className="mt-3">
              <ProgressBar usedRatio={1} />
            </div>
            <div className="mt-3.5">
              <button
                type="button"
                onClick={onRecordIncome}
                style={{
                  backgroundColor: 'var(--coin)',
                  color: 'var(--coin-ink)',
                }}
                className="min-h-[44px] rounded-[22px] px-4 text-[14px] font-extrabold transition-transform active:scale-95"
              >
                {UI_STRINGS.recordIncomeCta}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2.5">
            <p
              data-testid="hero-allowance-amount"
              style={{ fontVariantNumeric: 'proportional-nums' }}
              className="text-[52px] font-extrabold leading-[1.08] tracking-[-2px]"
            >
              <HeroAmountText value={formatHeroShort(animatedRemaining)} />
            </p>
            <p className="mt-1 text-[14px] font-medium opacity-95">
              dari jatah {formatHeroShort(dailyAllowance)} · terpakai{' '}
              {formatHeroShort(spentToday)}
            </p>
            <p
              data-testid="hero-total-balance"
              className="mt-0.5 flex items-baseline gap-1.5"
            >
              <span className="visually-hidden">
                {UI_STRINGS.remainingBalanceLabel} {formatSpokenRupiah(currentBalance)}
              </span>
              <span
                aria-hidden="true"
                style={{ color: 'var(--hero-muted)' }}
                className="text-[13px] font-bold"
              >
                {UI_STRINGS.remainingBalanceLabel}
              </span>
              <span aria-hidden="true" className="tabular-nums text-[14px] font-extrabold">
                {formatFull(currentBalance)}
              </span>
            </p>
            <div className="mt-3">
              <ProgressBar usedRatio={usedRatio} />
            </div>
          </div>
        )}

        <div
          style={{ backgroundColor: 'var(--hero-chip)' }}
          className="mt-3 flex items-center gap-3 rounded-[18px] p-2.5"
        >
          <Mascot mood={displayMood} size={40} />
          <p data-testid="mascot-message" className="text-[14px] font-semibold leading-snug">
            {mascotMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
