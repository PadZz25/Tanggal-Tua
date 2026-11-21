import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKENS_CSS = fs.readFileSync(
  path.resolve(process.cwd(), 'src/styles/tokens.css'),
  'utf8'
);

function extractThemeBlock(selectorRegex: RegExp): Record<string, string> {
  const match = selectorRegex.exec(TOKENS_CSS);
  if (!match) {
    throw new Error(`Theme block not found for ${selectorRegex}`);
  }
  const block = match[1];
  const vars: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const varMatch = /^\s*(--[a-z0-9-]+):\s*([^;]+);/i.exec(line);
    if (varMatch) {
      vars[varMatch[1]] = varMatch[2].trim();
    }
  }
  return vars;
}

const lightTokens = extractThemeBlock(/:root\s*\{([\s\S]*?)\n\}/);
const darkTokens = extractThemeBlock(/\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);

function resolveHex(tokens: Record<string, string>, tokenName: string): string {
  const raw = tokens[tokenName];
  if (!raw) throw new Error(`Missing token ${tokenName}`);
  const varRef = /^var\((--[a-z0-9-]+)\)$/.exec(raw);
  if (varRef) return resolveHex(tokens, varRef[1]);
  return raw;
}

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

function blendRgbaOnHex(
  fgRgb: [number, number, number],
  alpha: number,
  bgHex: string
): string {
  const bg = hexToRgb(bgHex);
  return rgbToHex([
    alpha * fgRgb[0] + (1 - alpha) * bg[0],
    alpha * fgRgb[1] + (1 - alpha) * bg[1],
    alpha * fgRgb[2] + (1 - alpha) * bg[2],
  ]);
}

function parseRgbaOnHex(rgba: string, bgHex: string): string {
  if (rgba.startsWith('#')) return rgba;
  const match =
    /rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i.exec(rgba);
  if (!match) throw new Error(`Unsupported color format: ${rgba}`);
  return blendRgbaOnHex(
    [Number(match[1]), Number(match[2]), Number(match[3])],
    Number(match[4]),
    bgHex
  );
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

const TONE_KEYS = [
  'makan',
  'transport',
  'jajan',
  'kosan',
  'paketan',
  'kuliah',
  'belanja',
  'hiburan',
  'lainnya',
] as const;

describe('Design tokens WCAG 2.2 AA contrast verification', () => {
  const lightPrimary = resolveHex(lightTokens, '--primary');
  const lightWarm = resolveHex(lightTokens, '--warm');
  const lightBg = resolveHex(lightTokens, '--bg');
  const lightSurface = resolveHex(lightTokens, '--surface');

  const lightTextPairs: Array<[string, string, string]> = [
    ['Light ink on bg', resolveHex(lightTokens, '--ink'), lightBg],
    ['Light ink on surface', resolveHex(lightTokens, '--ink'), lightSurface],
    ['Light muted on bg', resolveHex(lightTokens, '--muted'), lightBg],
    ['Light muted on surface', resolveHex(lightTokens, '--muted'), lightSurface],
    ['Light primary on bg', lightPrimary, lightBg],
    ['Light primary on surface', lightPrimary, lightSurface],
    ['Light on-primary on primary', resolveHex(lightTokens, '--on-primary'), lightPrimary],
    [
      'Light primary on primary-tint',
      lightPrimary,
      resolveHex(lightTokens, '--primary-tint'),
    ],
    [
      'Light coin-ink on coin badge',
      resolveHex(lightTokens, '--coin-ink'),
      resolveHex(lightTokens, '--coin'),
    ],
    ['Light white on warm hero', resolveHex(lightTokens, '--hero-ink'), lightWarm],
    ['Light warm-ink on bg', resolveHex(lightTokens, '--warm-ink'), lightBg],
    ['Light warm-ink on surface', resolveHex(lightTokens, '--warm-ink'), lightSurface],
    [
      'Light warm-ink on status-habis-bg',
      resolveHex(lightTokens, '--warm-ink'),
      resolveHex(lightTokens, '--status-habis-bg'),
    ],
    [
      'Light status-hampir on surface',
      resolveHex(lightTokens, '--status-hampir'),
      lightSurface,
    ],
    [
      'Light status-hampir on status-hampir-bg',
      resolveHex(lightTokens, '--status-hampir'),
      resolveHex(lightTokens, '--status-hampir-bg'),
    ],
    [
      'Light hero-muted on primary',
      parseRgbaOnHex(lightTokens['--hero-muted'], lightPrimary),
      lightPrimary,
    ],
    [
      'Light hero-muted on warm',
      parseRgbaOnHex(lightTokens['--hero-muted'], lightWarm),
      lightWarm,
    ],
    [
      'Light hero-ink on hero-chip over primary',
      resolveHex(lightTokens, '--hero-ink'),
      parseRgbaOnHex(lightTokens['--hero-chip'], lightPrimary),
    ],
    [
      'Light hero-ink on hero-chip over warm',
      resolveHex(lightTokens, '--hero-ink'),
      parseRgbaOnHex(lightTokens['--hero-chip'], lightWarm),
    ],
    ...TONE_KEYS.map(
      (k): [string, string, string] => [
        `Light tone ${k}`,
        resolveHex(lightTokens, `--tone-${k}-ink`),
        resolveHex(lightTokens, `--tone-${k}-bg`),
      ]
    ),
  ];

  const darkBg = resolveHex(darkTokens, '--bg');
  const darkSurface = resolveHex(darkTokens, '--surface');
  const darkPrimary = resolveHex(darkTokens, '--primary');
  const darkWarm = resolveHex(darkTokens, '--warm');
  const darkHeroBase = parseRgbaOnHex(darkTokens['--hero-bg'], darkBg);
  const darkHeroOverBlob = parseRgbaOnHex(
    darkTokens['--hero-bg'],
    blendRgbaOnHex([74, 91, 208], 0.45, darkBg)
  );

  const darkTextPairs: Array<[string, string, string]> = [
    ['Dark ink on bg', resolveHex(darkTokens, '--ink'), darkBg],
    ['Dark ink on surface', resolveHex(darkTokens, '--ink'), darkSurface],
    ['Dark muted on bg', resolveHex(darkTokens, '--muted'), darkBg],
    ['Dark muted on surface', resolveHex(darkTokens, '--muted'), darkSurface],
    ['Dark primary on bg', darkPrimary, darkBg],
    ['Dark primary on surface', darkPrimary, darkSurface],
    ['Dark on-primary on primary', resolveHex(darkTokens, '--on-primary'), darkPrimary],
    [
      'Dark primary on primary-tint',
      darkPrimary,
      resolveHex(darkTokens, '--primary-tint'),
    ],
    [
      'Dark coin-ink on coin badge',
      resolveHex(darkTokens, '--coin-ink'),
      resolveHex(darkTokens, '--coin'),
    ],
    ['Dark white on warm hero', resolveHex(darkTokens, '--hero-ink'), darkWarm],
    ['Dark warm-ink on bg', resolveHex(darkTokens, '--warm-ink'), darkBg],
    ['Dark warm-ink on surface', resolveHex(darkTokens, '--warm-ink'), darkSurface],
    [
      'Dark warm-ink on status-habis-bg',
      resolveHex(darkTokens, '--warm-ink'),
      resolveHex(darkTokens, '--status-habis-bg'),
    ],
    [
      'Dark status-hampir on surface',
      resolveHex(darkTokens, '--status-hampir'),
      darkSurface,
    ],
    [
      'Dark status-hampir on status-hampir-bg',
      resolveHex(darkTokens, '--status-hampir'),
      resolveHex(darkTokens, '--status-hampir-bg'),
    ],
    ['Dark hero-ink on glass hero base', resolveHex(darkTokens, '--hero-ink'), darkHeroBase],
    [
      'Dark hero-ink on glass hero over decorative blob',
      resolveHex(darkTokens, '--hero-ink'),
      darkHeroOverBlob,
    ],
    [
      'Dark hero-muted on glass hero over decorative blob',
      parseRgbaOnHex(darkTokens['--hero-muted'], darkHeroOverBlob),
      darkHeroOverBlob,
    ],
    [
      'Dark hero-muted on warm hero',
      parseRgbaOnHex(darkTokens['--hero-muted'], darkWarm),
      darkWarm,
    ],
    [
      'Dark hero-ink on hero-chip over glass hero + blob',
      resolveHex(darkTokens, '--hero-ink'),
      parseRgbaOnHex(darkTokens['--hero-chip'], darkHeroOverBlob),
    ],
    [
      'Dark hero-ink on hero-chip over warm hero',
      resolveHex(darkTokens, '--hero-ink'),
      parseRgbaOnHex(darkTokens['--hero-chip'], darkWarm),
    ],
    ...TONE_KEYS.map(
      (k): [string, string, string] => [
        `Dark tone ${k}`,
        resolveHex(darkTokens, `--tone-${k}-ink`),
        resolveHex(darkTokens, `--tone-${k}-bg`),
      ]
    ),
  ];

  it.each([...lightTextPairs, ...darkTextPairs])(
    '%s meets WCAG AA normal text >= 4.5:1',
    (_label, fg, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('meets WCAG 1.4.11 non-text contrast >= 3.0:1 for interactive control borders and progress fills', () => {
    expect(contrastRatio(resolveHex(lightTokens, '--border-control'), lightBg)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(lightTokens, '--border-control'), lightSurface)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(darkTokens, '--border-control'), darkBg)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(darkTokens, '--border-control'), darkSurface)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(lightTokens, '--coin'), lightPrimary)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(lightTokens, '--coin'), lightWarm)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(darkTokens, '--coin'), darkHeroOverBlob)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(resolveHex(darkTokens, '--coin'), darkWarm)).toBeGreaterThanOrEqual(3.0);
  });

  it('meets WCAG 1.4.11 >= 3:1 contrast against --surface and alternates luminance for all 9 chart tokens in light and dark themes', () => {
    for (let i = 1; i <= 9; i++) {
      const lightChart = resolveHex(lightTokens, `--chart-${i}`);
      const darkChart = resolveHex(darkTokens, `--chart-${i}`);
      expect(contrastRatio(lightChart, lightSurface)).toBeGreaterThanOrEqual(3.0);
      expect(contrastRatio(darkChart, darkSurface)).toBeGreaterThanOrEqual(3.0);
      if (i > 1) {
        const prevLight = resolveHex(lightTokens, `--chart-${i - 1}`);
        const prevDark = resolveHex(darkTokens, `--chart-${i - 1}`);
        expect(
          Math.abs(relativeLuminance(lightChart) - relativeLuminance(prevLight))
        ).toBeGreaterThanOrEqual(0.08);
        expect(
          Math.abs(relativeLuminance(darkChart) - relativeLuminance(prevDark))
        ).toBeGreaterThanOrEqual(0.1);
      }
    }
  });
});
