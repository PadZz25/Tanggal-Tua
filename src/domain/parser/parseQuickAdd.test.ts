import { describe, expect, it } from 'vitest';
import { ALL_DEFAULT_CATEGORIES, DEFAULT_CATEGORIES } from './keywords';
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

describe('parseQuickAdd domain contract (Table 6.5 & expanded income priority)', () => {
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

  describe('Expanded income & expense priority rules (Tugas 1)', () => {
    it('"gajian 3jt" -> income 3000000, Gaji/Freelance', () => {
      expect(parseQuickAdd('gajian 3jt', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 3_000_000,
        note: 'Gajian',
        categoryId: catIdByName('Gaji/Freelance', 'income'),
        date: TODAY,
      });
    });

    it('"THR 500rb" -> income, Lainnya', () => {
      expect(parseQuickAdd('THR 500rb', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 500_000,
        note: 'THR',
        categoryId: catIdByName('Lainnya', 'income'),
        date: TODAY,
      });
    });

    it('"transfer dari ortu 1jt" -> income, Kiriman ortu', () => {
      expect(parseQuickAdd('transfer dari ortu 1jt', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 1_000_000,
        note: 'Transfer dari ortu',
        categoryId: catIdByName('Kiriman ortu', 'income'),
        date: TODAY,
      });
    });

    it('"dikirimin ortu 500rb" -> income, Kiriman ortu', () => {
      expect(parseQuickAdd('dikirimin ortu 500rb', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 500_000,
        note: 'Dikirimin ortu',
        categoryId: catIdByName('Kiriman ortu', 'income'),
        date: TODAY,
      });
    });

    it('"dapet honor 250rb" -> income, Gaji/Freelance', () => {
      expect(parseQuickAdd('dapet honor 250rb', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 250_000,
        note: 'Dapet honor',
        categoryId: catIdByName('Gaji/Freelance', 'income'),
        date: TODAY,
      });
    });

    it('"uang masuk 200rb" -> income', () => {
      const res = parseQuickAdd('uang masuk 200rb', ctx);
      expect(res).toEqual({
        ok: true,
        type: 'income',
        amount: 200_000,
        note: 'Uang masuk',
        categoryId: catIdByName('Lainnya', 'income'),
        date: TODAY,
      });
    });

    it('"cashback 15rb" -> income', () => {
      const res = parseQuickAdd('cashback 15rb', ctx);
      expect(res).toEqual({
        ok: true,
        type: 'income',
        amount: 15_000,
        note: 'Cashback',
        categoryId: catIdByName('Lainnya', 'income'),
        date: TODAY,
      });
    });

    it('"transfer ke ortu 100rb" -> expense', () => {
      const res = parseQuickAdd('transfer ke ortu 100rb', ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.type).toBe('expense');
        expect(res.amount).toBe(100_000);
      }
    });

    it('"kirim ke teman 50rb" -> expense', () => {
      const res = parseQuickAdd('kirim ke teman 50rb', ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.type).toBe('expense');
        expect(res.amount).toBe(50_000);
      }
    });

    it('"tiket masuk 25rb" -> expense (regresi)', () => {
      const res = parseQuickAdd('tiket masuk 25rb', ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.type).toBe('expense');
        expect(res.amount).toBe(25_000);
      }
    });

    it('"beli hadiah 80rb" -> expense', () => {
      const res = parseQuickAdd('beli hadiah 80rb', ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.type).toBe('expense');
        expect(res.amount).toBe(80_000);
      }
    });

    it('"dapat diskon makan 20rb" -> expense, Makan', () => {
      expect(parseQuickAdd('dapat diskon makan 20rb', ctx)).toEqual({
        ok: true,
        type: 'expense',
        amount: 20_000,
        note: 'Dapat diskon makan',
        categoryId: catIdByName('Makan', 'expense'),
        date: TODAY,
      });
    });

    it('"+75rb jual buku" -> income', () => {
      const res = parseQuickAdd('+75rb jual buku', ctx);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.type).toBe('income');
        expect(res.amount).toBe(75_000);
      }
    });

    it('parses comma-grouped "rp 18,500" / "rp 1,500,000" accurately and rejects ambiguous "rp 18,5"', () => {
      expect(parseQuickAdd('rp 18,500 kopi', ctx)).toEqual({
        ok: true,
        type: 'expense',
        amount: 18_500,
        note: 'Kopi',
        categoryId: catIdByName('Jajan'),
        date: TODAY,
      });

      expect(parseQuickAdd('rp 1,500,000 gaji', ctx)).toEqual({
        ok: true,
        type: 'income',
        amount: 1_500_000,
        note: 'Gaji',
        categoryId: catIdByName('Gaji/Freelance', 'income'),
        date: TODAY,
      });

      expect(parseQuickAdd('rp 18,5 kopi', ctx)).toEqual({
        ok: false,
        error: 'INVALID_AMOUNT',
        hint: 'Nominalnya belum terbaca',
      });
    });

    it('excludes system categories (Tabungan / Tarik tabungan) from parser category matching', () => {
      const res = parseQuickAdd('tabungan 50rb', {
        today: TODAY,
        categories: ALL_DEFAULT_CATEGORIES,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.categoryId).toBe(catIdByName('Lainnya', 'expense'));
      }
    });
  });
});
