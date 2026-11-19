const FIXED_CATEGORY_CHART_TOKENS: Record<string, string> = {
  'cat-makan': 'var(--chart-1)',
  'cat-jajan': 'var(--chart-2)',
  'cat-transport': 'var(--chart-3)',
  'cat-kosan': 'var(--chart-4)',
  'cat-paketan': 'var(--chart-5)',
  'cat-kuliah': 'var(--chart-6)',
  'cat-belanja': 'var(--chart-7)',
  'cat-hiburan': 'var(--chart-8)',
  'cat-lainnya-expense': 'var(--chart-9)',
};

const ALL_CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
] as const;

export function getCategoryChartColor(categoryId: string): string {
  const fixed = FIXED_CATEGORY_CHART_TOKENS[categoryId];
  if (fixed) return fixed;

  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return ALL_CHART_TOKENS[hash % ALL_CHART_TOKENS.length];
}
