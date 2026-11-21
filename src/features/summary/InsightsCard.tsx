import { ChevronDown, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { InsightItem } from '../../domain/insights';

interface InsightsCardProps {
  insights: InsightItem[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <section
      aria-labelledby="summary-insights-heading"
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-tint)] text-[var(--primary)]"
        >
          <Lightbulb size={16} strokeWidth={2.2} />
        </span>
        <h2
          id="summary-insights-heading"
          className="text-[15px] font-extrabold text-[var(--ink)]"
        >
          Insight
        </h2>
      </div>

      {insights.length === 0 ? (
        <p className="mt-2.5 text-[13px] font-medium text-[var(--muted)]">
          Belum ada insight. Catat beberapa hari dulu, nanti muncul di sini.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border-soft)]">
          {insights.map((item) => {
            const isOpen = expandedId === item.id;
            const panelId = `insight-detail-${item.id}`;
            return (
              <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-[14px] font-bold leading-snug text-[var(--ink)]">
                  {item.text}
                </p>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-[12px] font-bold text-[var(--primary)] hover:underline"
                >
                  <span>Kenapa muncul?</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p
                    id={panelId}
                    className="mt-1 rounded-[14px] bg-[var(--bg)] px-3 py-2 text-[12px] font-medium leading-relaxed text-[var(--muted)]"
                  >
                    {item.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
