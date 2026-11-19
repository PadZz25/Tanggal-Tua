import { describe, expect, it } from 'vitest';
import {
  formatFull,
  formatHeroShort,
  formatShort,
  formatSpokenRupiah,
  isValidAmount,
  MINUS_SIGN,
  parseNominalInput,
} from './money';

describe('money domain functions', () => {
  describe('formatShort', () => {
    it('formats values under 1000 with Rp prefix', () => {
      expect(formatShort(750)).toBe('Rp 750');
      expect(formatShort(0)).toBe('Rp 0');
    });

    it('formats exact thousands with rb suffix', () => {
      expect(formatShort(1000)).toBe('1rb');
      expect(formatShort(36000)).toBe('36rb');
    });

    it('formats non-multiple thousands with one comma decimal', () => {
      expect(formatShort(1500)).toBe('1,5rb');
      expect(formatShort(36500)).toBe('36,5rb');
    });

    it('formats millions with jt suffix and up to 2 decimals without trailing zeros', () => {
      expect(formatShort(1500000)).toBe('1,5jt');
      expect(formatShort(2000000)).toBe('2jt');
      expect(formatShort(1250000)).toBe('1,25jt');
    });

    it('formats negative amounts using U+2212 minus character', () => {
      expect(formatShort(-15000)).toBe(`${MINUS_SIGN}15rb`);
      expect(formatShort(-750)).toBe(`${MINUS_SIGN}Rp 750`);
    });

    it('formats hero amounts with Rp prefix', () => {
      expect(formatHeroShort(36000)).toBe('Rp 36rb');
      expect(formatHeroShort(65000)).toBe('Rp 65rb');
      expect(formatHeroShort(-8000)).toBe(`${MINUS_SIGN}Rp 8rb`);
      expect(formatHeroShort(0)).toBe('Rp 0');
    });
  });

  describe('formatFull', () => {
    it('formats full IDR currency string with dot separators', () => {
      expect(formatFull(36000)).toBe('Rp 36.000');
      expect(formatFull(1500000)).toBe('Rp 1.500.000');
      expect(formatFull(-8000)).toBe(`${MINUS_SIGN}Rp 8.000`);
    });
  });

  describe('formatSpokenRupiah', () => {
    it('formats readable Indonesian spoken currency text for screen readers', () => {
      expect(formatSpokenRupiah(845_000)).toBe('845 ribu rupiah');
      expect(formatSpokenRupiah(-20_000)).toBe('minus 20 ribu rupiah');
      expect(formatSpokenRupiah(2_000_000)).toBe('2 juta rupiah');
      expect(formatSpokenRupiah(845_500)).toBe('845.500 rupiah');
      expect(formatSpokenRupiah(0)).toBe('0 rupiah');
    });
  });

  describe('isValidAmount & parseNominalInput', () => {
    it('validates amount bounds 1..1_000_000_000', () => {
      expect(isValidAmount(1)).toBe(true);
      expect(isValidAmount(1_000_000_000)).toBe(true);
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(1_000_000_001)).toBe(false);
      expect(isValidAmount(12.5)).toBe(false);
    });

    it('parses human nominal strings for onboarding and forms', () => {
      expect(parseNominalInput('850rb')).toBe(850_000);
      expect(parseNominalInput('1,5jt')).toBe(1_500_000);
      expect(parseNominalInput('Rp 250.000')).toBe(250_000);
      expect(parseNominalInput('50000')).toBe(50_000);
      expect(parseNominalInput('abc')).toBeNull();
    });
  });
});
