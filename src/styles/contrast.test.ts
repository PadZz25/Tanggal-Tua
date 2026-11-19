import { describe, expect, it } from 'vitest';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((c) => Math.round(c).toString(16).padStart(2, '0').toUpperCase())
      .join('')
  );
}

function blendRgbaOnHex(fgRgb: [number, number, number], alpha: number, bgHex: string): string {
  const bg = hexToRgb(bgHex);
  return rgbToHex([
    alpha * fgRgb[0] + (1 - alpha) * bg[0],
    alpha * fgRgb[1] + (1 - alpha) * bg[1],
    alpha * fgRgb[2] + (1 - alpha) * bg[2],
  ]);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Design tokens WCAG 2.2 AA contrast verification', () => {
  const lightTextPairs: Array<[string, string, string]> = [
    ['Light ink on bg', '#231C16', '#FAF5EC'],
    ['Light ink on surface', '#231C16', '#FFFFFF'],
    ['Light muted on bg', '#6B5E52', '#FAF5EC'],
    ['Light muted on surface', '#6B5E52', '#FFFFFF'],
    ['Light on-primary on primary', '#FFFFFF', '#2B3A8C'],
    ['Light primary on primary-tint', '#2B3A8C', '#E3E7FB'],
    ['Light coin-ink on coin badge', '#231C16', '#F2B33D'],
    ['Light white on warm hero', '#FFFFFF', '#9E3F27'],
    [
      'Light hero-muted on primary',
      blendRgbaOnHex([255, 255, 255], 0.85, '#2B3A8C'),
      '#2B3A8C',
    ],
    [
      'Light hero-muted on warm',
      blendRgbaOnHex([255, 255, 255], 0.85, '#9E3F27'),
      '#9E3F27',
    ],
    [
      'Light white on hero-chip over primary',
      '#FFFFFF',
      blendRgbaOnHex([255, 255, 255], 0.16, '#2B3A8C'),
    ],
    [
      'Light white on hero-chip over warm',
      '#FFFFFF',
      blendRgbaOnHex([255, 255, 255], 0.16, '#9E3F27'),
    ],
    ['Light tone makan', '#7A4300', '#FDE7C2'],
    ['Light tone transport', '#2B3A8C', '#DDE2FA'],
    ['Light tone jajan', '#5A3A24', '#EAD9C8'],
    ['Light tone kosan', '#1F5A36', '#D9EBDD'],
    ['Light tone paketan', '#4B2E83', '#E6DDF5'],
    ['Light tone kuliah', '#17566B', '#D8EEF2'],
    ['Light tone belanja', '#8A2F2F', '#F6DADA'],
    ['Light tone hiburan', '#8A2A5B', '#FBE3EE'],
    ['Light tone lainnya', '#5B5146', '#ECE6DC'],
  ];

  const darkHeroBase = blendRgbaOnHex([154, 167, 255], 0.14, '#14110E');
  const darkHeroOverBlob = blendRgbaOnHex(
    [154, 167, 255],
    0.14,
    blendRgbaOnHex([74, 91, 208], 0.45, '#14110E')
  );

  const darkTextPairs: Array<[string, string, string]> = [
    ['Dark ink on bg', '#F6EFE4', '#14110E'],
    ['Dark ink on surface', '#F6EFE4', '#1E1A16'],
    ['Dark muted on bg', '#B8AB9B', '#14110E'],
    ['Dark muted on surface', '#B8AB9B', '#1E1A16'],
    ['Dark on-primary on primary', '#14110E', '#A9B4FF'],
    ['Dark primary on primary-tint', '#A9B4FF', '#262C5E'],
    ['Dark coin-ink on coin badge', '#231C16', '#F5C04D'],
    ['Dark white on warm hero', '#FFFFFF', '#9E3F27'],
    ['Dark white on glass hero base', '#FFFFFF', darkHeroBase],
    ['Dark white on glass hero over decorative blob', '#FFFFFF', darkHeroOverBlob],
    [
      'Dark hero-muted on glass hero over decorative blob',
      blendRgbaOnHex([255, 255, 255], 0.85, darkHeroOverBlob),
      darkHeroOverBlob,
    ],
    [
      'Dark hero-muted on warm hero',
      blendRgbaOnHex([255, 255, 255], 0.85, '#9E3F27'),
      '#9E3F27',
    ],
    [
      'Dark white on hero-chip over glass hero + blob',
      '#FFFFFF',
      blendRgbaOnHex([255, 255, 255], 0.12, darkHeroOverBlob),
    ],
    [
      'Dark white on hero-chip over warm hero',
      '#FFFFFF',
      blendRgbaOnHex([255, 255, 255], 0.12, '#9E3F27'),
    ],
    ['Dark tone makan', '#F5C04D', '#3B2A12'],
    ['Dark tone transport', '#A9B4FF', '#262C5E'],
    ['Dark tone jajan', '#E3C2A0', '#3A2B20'],
    ['Dark tone kosan', '#8CE0A8', '#1A3324'],
    ['Dark tone paketan', '#D4BFFF', '#2D2246'],
    ['Dark tone kuliah', '#89D9F2', '#18343E'],
    ['Dark tone belanja', '#F8A9A9', '#3D1F1F'],
    ['Dark tone hiburan', '#F7A8D0', '#3D1D2E'],
    ['Dark tone lainnya', '#D4C8B8', '#2E2923'],
  ];

  it.each([...lightTextPairs, ...darkTextPairs])(
    '%s meets WCAG AA normal text >= 4.5:1',
    (_label, fg, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('meets WCAG 1.4.11 non-text contrast >= 3.0:1 for interactive control borders and progress fills', () => {
    expect(contrastRatio('#8C7D6E', '#FAF5EC')).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio('#8C7D6E', '#FFFFFF')).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio('#7A6E62', '#14110E')).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio('#7A6E62', '#1E1A16')).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio('#F2B33D', '#2B3A8C')).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio('#F2B33D', '#9E3F27')).toBeGreaterThanOrEqual(3.0);
  });
});
