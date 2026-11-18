import { addDays } from '../dates';
import { MAX_AMOUNT, MIN_AMOUNT } from '../money';
import { PARSER_HINTS } from '../copy';
import type { Category, ParseResult } from '../types';
import {
  EXPENSE_MARKERS,
  STRONG_INCOME_KEYWORDS,
  WEAK_INCOME_KEYWORDS,
} from './keywords';

interface AmountCandidate {
  start: number;
  end: number;
  value: number;
  hasPlusPrefix: boolean;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.,]+/gu, ' ')
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWholePhrase(normalizedHaystack: string, phraseLower: string): boolean {
  const pattern = new RegExp(`(?:^|\\s)${escapeRegex(phraseLower)}(?=\\s|$)`, 'i');
  return pattern.test(normalizedHaystack);
}

function findPhraseIndex(normalizedHaystack: string, phraseLower: string): number {
  const pattern = new RegExp(`(?:^|\\s)(${escapeRegex(phraseLower)})(?=\\s|$)`, 'i');
  const match = pattern.exec(normalizedHaystack);
  if (!match) return -1;
  return match.index + (match[0].length - match[1].length);
}

const DIRECTION_TO_PERSON_REGEX =
  /(?:^|\s)(?:(?:transfer|tf|kirim|kiriman|uang|dana|bayar|kasih|traktir)\s+ke\s+\p{L}+|ke\s+(?:ortu|orang\s+tua|teman|temen|kawan|adik|adek|kakak|abang|ibu|bapak|mama|papa|ayah|bunda|pacar|doi))(?=\s|$)/iu;

function extractAmountCandidates(input: string): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  const tokenRegex =
    /(?:^|\s)(\+)?(?:(rp)\s*(\d+(?:\.\d{3})+|\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?|(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)|(\d+(?:\.\d{3})+|\d+))(?=\s|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(input)) !== null) {
    const leadingWhitespaceLen = match[0].startsWith(' ') || match[0].startsWith('\t') ? 1 : 0;
    const tokenStart = match.index + leadingWhitespaceLen;
    const tokenEnd = match.index + match[0].length;
    const hasPlusPrefix = match[1] === '+';

    if (match[2]) {
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
      const rawPlain = match[7];
      const digitsOnly = rawPlain.replace(/\./g, '');
      const numeric = parseInt(digitsOnly, 10);
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

export function detectTransactionType(
  textWithoutAmount: string,
  hasPlusPrefix: boolean
): 'expense' | 'income' {
  // 1. Nominal berawalan "+" -> income
  if (hasPlusPrefix) return 'income';

  const normalized = normalizeForMatching(textWithoutAmount);
  if (!normalized) return 'expense';

  // 2. Ada penanda pengeluaran atau pola arah "ke <orang>" -> expense
  if (
    EXPENSE_MARKERS.some((marker) => hasWholePhrase(normalized, marker)) ||
    DIRECTION_TO_PERSON_REGEX.test(normalized)
  ) {
    return 'expense';
  }

  // 3. Ada kata kunci pemasukan KUAT -> income
  if (STRONG_INCOME_KEYWORDS.some((kw) => hasWholePhrase(normalized, kw))) {
    return 'income';
  }

  // 4. Ada kata kunci pemasukan LEMAH -> income
  if (WEAK_INCOME_KEYWORDS.some((kw) => hasWholePhrase(normalized, kw))) {
    return 'income';
  }

  // 5. Selain itu -> expense
  return 'expense';
}

function matchCategory(
  rawText: string,
  type: 'expense' | 'income',
  categories: Category[]
): string {
  const normalized = normalizeForMatching(rawText);
  const relevantCategories = categories.filter((c) => c.kind === type);

  let bestCategoryId: string | null = null;
  let earliestIndex = Number.POSITIVE_INFINITY;
  let longestKeywordLen = 0;

  for (const cat of relevantCategories) {
    for (const kw of cat.keywords) {
      const kwNormalized = normalizeForMatching(kw);
      if (!kwNormalized) continue;
      const idx = findPhraseIndex(normalized, kwNormalized);
      if (idx !== -1) {
        if (
          idx < earliestIndex ||
          (idx === earliestIndex && kwNormalized.length > longestKeywordLen)
        ) {
          earliestIndex = idx;
          longestKeywordLen = kwNormalized.length;
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
  const categoryId = matchCategory(remainingText, txType, ctx.categories);

  return {
    ok: true,
    type: txType,
    amount: candidate.value,
    note: cleanedNote.slice(0, 80),
    categoryId,
    date: targetDate,
  };
}
