import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './keywords';
import { parseQuickAdd } from './parseQuickAdd';

const TODAY = '2026-11-18';
const YESTERDAY = '2026-11-17';

function catIdByName(name: string, kind: 'expense' | 'income' = 'expense'): string {
  const found = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() && c.kind === kind
  );
  if (!found) throw new Error(`Category not found: ${name} (${kind})`);
  return found.id;
}

describe('parseQuickAdd domain contract (Table 6.5 & edge cases)', () => {
  const ctx = { today: TODAY, categories: DEFAULT_CATEGORIES };

  it('1. "kopi 18rb" -> expense, 18000, "Kopi", Jajan', () => {
    expect(parseQuickAdd('kopi 18rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 18_000,
      note: 'Kopi',
      categoryId: catIdByName('Jajan'),
      date: TODAY,
    });
  });

  it('2. "kopi susu 18.000" -> expense, 18000, "Kopi susu", Jajan', () => {
    expect(parseQuickAdd('kopi susu 18.000', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 18_000,
      note: 'Kopi susu',
      categoryId: catIdByName('Jajan'),
      date: TODAY,
    });
  });

  it('3. "makan siang 15k" -> expense, 15000, "Makan siang", Makan', () => {
    expect(parseQuickAdd('makan siang 15k', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 15_000,
      note: 'Makan siang',
      categoryId: catIdByName('Makan'),
      date: TODAY,
    });
  });

  it('4. "parkir 2rb" -> expense, 2000, Transport', () => {
    expect(parseQuickAdd('parkir 2rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 2_000,
      note: 'Parkir',
      categoryId: catIdByName('Transport'),
      date: TODAY,
    });
  });

  it('5. "bensin 20000" -> expense, 20000, Transport', () => {
    expect(parseQuickAdd('bensin 20000', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 20_000,
      note: 'Bensin',
      categoryId: catIdByName('Transport'),
      date: TODAY,
    });
  });

  it('6. "nasi 10 rb" -> expense, 10000, Makan', () => {
    expect(parseQuickAdd('nasi 10 rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 10_000,
      note: 'Nasi',
      categoryId: catIdByName('Makan'),
      date: TODAY,
    });
  });

  it('7. "rp 25.000 bakso" -> expense, 25000, "Bakso", Makan', () => {
    expect(parseQuickAdd('rp 25.000 bakso', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 25_000,
      note: 'Bakso',
      categoryId: catIdByName('Makan'),
      date: TODAY,
    });
  });

  it('8. "bakso 2 porsi 20rb" -> expense, 20000 (ignores 2 < 1000 as portion)', () => {
    expect(parseQuickAdd('bakso 2 porsi 20rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 20_000,
      note: 'Bakso 2 porsi',
      categoryId: catIdByName('Makan'),
      date: TODAY,
    });
  });

  it('9. "kiriman ortu 1,5jt" -> income, 1500000, Kiriman ortu', () => {
    expect(parseQuickAdd('kiriman ortu 1,5jt', ctx)).toEqual({
      ok: true,
      type: 'income',
      amount: 1_500_000,
      note: 'Kiriman ortu',
      categoryId: catIdByName('Kiriman ortu', 'income'),
      date: TODAY,
    });
  });

  it('10. "+500rb freelance" -> income, 500000', () => {
    expect(parseQuickAdd('+500rb freelance', ctx)).toEqual({
      ok: true,
      type: 'income',
      amount: 500_000,
      note: 'Freelance',
      categoryId: catIdByName('Gaji/Freelance', 'income'),
      date: TODAY,
    });
  });

  it('11. "kopi 18rb kemarin" -> expense, 18000, date = today-1, note "Kopi"', () => {
    expect(parseQuickAdd('kopi 18rb kemarin', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 18_000,
      note: 'Kopi',
      categoryId: catIdByName('Jajan'),
      date: YESTERDAY,
    });
  });

  it('12. "1.500" -> expense, 1500, note "Pengeluaran", Lainnya', () => {
    expect(parseQuickAdd('1.500', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 1_500,
      note: 'Pengeluaran',
      categoryId: catIdByName('Lainnya', 'expense'),
      date: TODAY,
    });
  });

  it('13. "2,5rb" -> expense, 2500', () => {
    expect(parseQuickAdd('2,5rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 2_500,
      note: 'Pengeluaran',
      categoryId: catIdByName('Lainnya', 'expense'),
      date: TODAY,
    });
  });

  it('14. "18rb" -> expense, 18000, note "Pengeluaran"', () => {
    expect(parseQuickAdd('18rb', ctx)).toEqual({
      ok: true,
      type: 'expense',
      amount: 18_000,
      note: 'Pengeluaran',
      categoryId: catIdByName('Lainnya', 'expense'),
      date: TODAY,
    });
  });

  it('15. "kopi" -> error NO_AMOUNT', () => {
    const res = parseQuickAdd('kopi', ctx);
    expect(res).toEqual({
      ok: false,
      error: 'NO_AMOUNT',
      hint: 'Tambah nominal, mis. 10rb',
    });
  });

  it('16. "nasi 10" -> error NO_AMOUNT', () => {
    const res = parseQuickAdd('nasi 10', ctx);
    expect(res).toEqual({
      ok: false,
      error: 'NO_AMOUNT',
      hint: 'Tambah nominal, mis. 10rb',
    });
  });

  it('17. "es teh 4rb dan parkir 2rb" -> error MULTIPLE_AMOUNTS', () => {
    const res = parseQuickAdd('es teh 4rb dan parkir 2rb', ctx);
    expect(res).toEqual({
      ok: false,
      error: 'MULTIPLE_AMOUNTS',
      hint: 'Catat satu per satu dulu ya',
    });
  });

  it('18. "kopi 0" -> error NO_AMOUNT (0 < 1000 ignored)', () => {
    const res = parseQuickAdd('kopi 0', ctx);
    expect(res).toEqual({
      ok: false,
      error: 'NO_AMOUNT',
      hint: 'Tambah nominal, mis. 10rb',
    });
  });

  it('19. "   " -> error EMPTY', () => {
    const res = parseQuickAdd('   ', ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('EMPTY');
    }
  });

  it('disambiguates "masuk tol 15rb" and "tiket masuk 25rb" as expense, not income', () => {
    const tolRes = parseQuickAdd('masuk tol 15rb', ctx);
    expect(tolRes).toEqual({
      ok: true,
      type: 'expense',
      amount: 15_000,
      note: 'Masuk tol',
      categoryId: catIdByName('Transport'),
      date: TODAY,
    });

    const tiketRes = parseQuickAdd('tiket masuk 25rb', ctx);
    expect(tiketRes.ok).toBe(true);
    if (tiketRes.ok) {
      expect(tiketRes.type).toBe('expense');
    }
  });

  it('rejects backdated "kemarin" transaction when date < openingDate', () => {
    const res = parseQuickAdd('kopi 18rb kemarin', {
      ...ctx,
      openingDate: TODAY,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('BEFORE_OPENING_DATE');
    }
  });

  it('rejects out-of-range amounts > 1_000_000_000', () => {
    const res = parseQuickAdd('rumah 2000jt', ctx);
    expect(res).toEqual({
      ok: false,
      error: 'OUT_OF_RANGE',
      hint: 'Nominalnya di luar batas wajar',
    });
  });
});
