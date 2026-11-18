export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 1_000_000_000;
export const MINUS_SIGN = '\u2212';

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT;
}

function formatDecimalComma(value: number, maxDecimals: number): string {
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(value * factor) / factor;
  const fixed = rounded.toFixed(maxDecimals).replace(/\.?0+$/, '');
  return fixed.replace('.', ',');
}

export function formatShort(
  amount: number,
  options?: { withPrefix?: boolean }
): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.trunc(amount));
  const withPrefix = options?.withPrefix ?? false;
  const sign = isNegative ? MINUS_SIGN : '';

  if (abs < 1_000) {
    return `${sign}Rp ${abs}`;
  }

  const prefix = withPrefix ? 'Rp ' : '';

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}${prefix}${formatDecimalComma(millions, 2)}jt`;
  }

  const thousands = abs / 1_000;
  return `${sign}${prefix}${formatDecimalComma(thousands, 1)}rb`;
}

export function formatHeroShort(amount: number): string {
  return formatShort(amount, { withPrefix: true });
}

export function formatFull(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.trunc(amount));
  const formatted = idrFormatter.format(abs).replace(/\u00a0/g, ' ');
  return isNegative ? `${MINUS_SIGN}${formatted}` : formatted;
}

export function parseNominalInput(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/^rp\s*/i, '').trim();
  if (!cleaned) return null;

  const unitMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)$/i);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1].replace(',', '.'));
    if (Number.isNaN(num)) return null;
    const unit = unitMatch[2].toLowerCase();
    const mult = unit === 'jt' || unit === 'juta' ? 1_000_000 : 1_000;
    return Math.round(num * mult);
  }

  const digitsOnly = cleaned.replace(/\./g, '');
  if (!/^\d+$/.test(digitsOnly)) return null;
  return parseInt(digitsOnly, 10);
}
