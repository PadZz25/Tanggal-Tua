import { addDays } from '../dates';
import { MAX_AMOUNT, MIN_AMOUNT } from '../money';
import { PARSER_HINTS } from '../copy';
import type { Category, ParseResult } from '../types';
import { EXPENSE_DISAMBIGUATION_WORDS, INCOME_TRIGGER_KEYWORDS } from './keywords';

interface AmountCandidate {
  start: number;
  end: number;
  value: number;
  hasPlusPrefix: boolean;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholePhrase(haystackLower: string, phraseLower: string): boolean {
  const pattern = new RegExp(`(?:^|\\s)${escapeRegex(phraseLower)}(?=\\s|$)`, 'i');
  return pattern.test(haystackLower);
}

function findPhraseIndex(haystackLower: string, phraseLower: string): number {
  const pattern = new RegExp(`(?:^|\\s)(${escapeRegex(phraseLower)})(?=\\s|$)`, 'i');
  const match = pattern.exec(haystackLower);
  if (!match) return -1;
  return match.index + (match[0].length - match[1].length);
}

function extractAmountCandidates(input: string): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  // Matches:
  // 1) Optional '+', optional 'rp', number + unit (rb, ribu, k, jt, juta)
  // 2) Optional '+', mandatory 'rp' + number (with optional thousand dots)
  // 3) Optional '+', plain number (with or without thousand dots)
  const tokenRegex =
    /(?:^|\s)(\+)?(?:(rp)\s*(\d+(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?|(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)|(\d+(?:\.\d{3})+|\d+))(?=\s|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(input)) !== null) {
    const leadingWhitespaceLen = match[0].startsWith(' ') || match[0].startsWith('\t') ? 1 : 0;
    const tokenStart = match.index + leadingWhitespaceLen;
    const tokenEnd = match.index + match[0].length;
    const hasPlusPrefix = match[1] === '+';

    if (match[2]) {
      // Branch 1: Starts with "rp"
      const rawNum = match[3];
      const unit = match[4]?.toLowerCase();
      if (unit) {
        const numeric = parseFloat(rawNum.replace(',', '.'));
        const mult = unit === 'jt' || unit === 'juta' ? 1_000_000 : 1_000;
        candidates.push({
          start: tokenStart,
          end: tokenEnd,
          value: Math.round(numeric * mult),
          hasPlusPrefix,
        });
      } else {
        const digits = rawNum.replace(/\./g, '');
        const numeric = parseInt(digits, 10);
        candidates.push({
          start: tokenStart,
          end: tokenEnd,
          value: Number.isNaN(numeric) ? 0 : numeric,
          hasPlusPrefix,
        });
      }
      continue;
    }

    if (match[5] && match[6]) {
      // Branch 2: Number + unit (rb, ribu, k, jt, juta)
      const rawNum = match[5].replace(',', '.');
      const unit = match[6].toLowerCase();
      const numeric = parseFloat(rawNum);
      const mult = unit === 'jt' || unit === 'juta' ? 1_000_000 : 1_000;
      candidates.push({
        start: tokenStart,
        end: tokenEnd,
        value: Math.round(numeric * mult),
        hasPlusPrefix,
      });
      continue;
    }

    if (match[7]) {
      // Branch 3: Plain number without unit or 'rp'
      const rawPlain = match[7];
      const digitsOnly = rawPlain.replace(/\./g, '');
      const numeric = parseInt(digitsOnly, 10);
      // Plain numbers < 1000 without unit are ignored as portion/quantity (e.g. "bakso 2 porsi 20rb")
      if (!Number.isNaN(numeric) && numeric >= 1_000) {
        candidates.push({
          start: tokenStart,
          end: tokenEnd,
          value: numeric,
          hasPlusPrefix,
        });
      }
    }
  }

  return candidates;
}

function detectTransactionType(
  textWithoutAmount: string,
  hasPlusPrefix: boolean
): 'expense' | 'income' {
  if (hasPlusPrefix) return 'income';

  const normalized = textWithoutAmount.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return 'expense';

  const hasExpenseDisambiguator = EXPENSE_DISAMBIGUATION_WORDS.some((word) =>
    hasWholePhrase(normalized, word)
  );

  for (const kw of INCOME_TRIGGER_KEYWORDS) {
    if (hasWholePhrase(normalized, kw)) {
      if ((kw === 'masuk' || kw === 'kiriman') && hasExpenseDisambiguator) {
        continue;
      }
      return 'income';
    }
  }

  return 'expense';
}

function matchCategory(
  noteLower: string,
  type: 'expense' | 'income',
  categories: Category[]
): string {
  const relevantCategories = categories.filter((c) => c.kind === type);

  let bestCategoryId: string | null = null;
  let earliestIndex = Number.POSITIVE_INFINITY;
  let longestKeywordLen = 0;

  for (const cat of relevantCategories) {
    for (const kw of cat.keywords) {
      const kwLower = kw.toLowerCase().trim();
      if (!kwLower) continue;
      const idx = findPhraseIndex(noteLower, kwLower);
      if (idx !== -1) {
        if (
          idx < earliestIndex ||
          (idx === earliestIndex && kwLower.length > longestKeywordLen)
        ) {
          earliestIndex = idx;
          longestKeywordLen = kwLower.length;
          bestCategoryId = cat.id;
        }
      }
    }
  }

  if (bestCategoryId) return bestCategoryId;

  const fallback =
    relevantCategories.find((c) => c.name.toLowerCase() === 'lainnya') ??
    relevantCategories[relevantCategories.length - 1];

  return fallback ? fallback.id : type === 'income' ? 'cat-lainnya-income' : 'cat-lainnya-expense';
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function parseQuickAdd(
  input: string,
  ctx: { today: string; categories: Category[]; openingDate?: string }
): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'EMPTY',
      hint: PARSER_HINTS.EMPTY,
    };
  }

  const candidates = extractAmountCandidates(trimmed);

  if (candidates.length === 0) {
    return {
      ok: false,
      error: 'NO_AMOUNT',
      hint: PARSER_HINTS.NO_AMOUNT,
    };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      error: 'MULTIPLE_AMOUNTS',
      hint: PARSER_HINTS.MULTIPLE_AMOUNTS,
    };
  }

  const candidate = candidates[0];

  if (!Number.isFinite(candidate.value) || candidate.value <= 0) {
    return {
      ok: false,
      error: 'INVALID_AMOUNT',
      hint: PARSER_HINTS.INVALID_AMOUNT,
    };
  }

  if (candidate.value < MIN_AMOUNT || candidate.value > MAX_AMOUNT) {
    return {
      ok: false,
      error: 'OUT_OF_RANGE',
      hint: PARSER_HINTS.OUT_OF_RANGE,
    };
  }

  let remainingText = (
    trimmed.slice(0, candidate.start) +
    ' ' +
    trimmed.slice(candidate.end)
  )
    .replace(/\s+/g, ' ')
    .trim();

  let targetDate = ctx.today;
  const kemarinRegex = /(?:^|\s)kemarin(?=\s|$)/gi;
  if (kemarinRegex.test(remainingText)) {
    targetDate = addDays(ctx.today, -1);
    remainingText = remainingText.replace(kemarinRegex, ' ').replace(/\s+/g, ' ').trim();
  }

  if (ctx.openingDate && targetDate < ctx.openingDate) {
    return {
      ok: false,
      error: 'BEFORE_OPENING_DATE',
      hint: PARSER_HINTS.BEFORE_OPENING_DATE,
    };
  }

  // Strip stray leading '+' if present separately
  let hasStandalonePlus = false;
  if (remainingText.startsWith('+')) {
    hasStandalonePlus = true;
    remainingText = remainingText.slice(1).trim();
  }

  const txType = detectTransactionType(
    remainingText,
    candidate.hasPlusPrefix || hasStandalonePlus
  );

  const defaultNote = txType === 'income' ? 'Pemasukan' : 'Pengeluaran';
  const cleanedNote = remainingText ? capitalizeFirst(remainingText) : defaultNote;
  const categoryId = matchCategory(remainingText.toLowerCase(), txType, ctx.categories);

  return {
    ok: true,
    type: txType,
    amount: candidate.value,
    note: cleanedNote.slice(0, 80),
    categoryId,
    date: targetDate,
  };
}
