import type { ThemeTrend } from "@/lib/queries";

function Movement({ current, previous }: { current: number; previous: number }) {
  if (current === 0 && previous === 0) return <span className="text-faint">no reports</span>;
  if (previous === 0) return <span className="text-medium">new activity</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-muted">unchanged</span>;
  return <span className={pct > 0 ? "text-high" : "text-good"}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

/** Approved reports per theme, last 30 days against the previous 30. */
export function ThemeBars({ trends }: { trends: ThemeTrend[] }) {
  const max = Math.max(1, ...trends.flatMap((t) => [t.current, t.previous]));
  return (
    <div className="space-y-4">
      {trends.map((t) => (
        <div key={t.slug}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{t.name}</span>
            <span className="font-mono text-xs">
              <span className="text-ink">{t.current}</span> <span className="text-faint">vs {t.previous}</span> · <Movement {...t} />
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-line">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(t.current / max) * 100}%` }} />
          </div>
          <div className="mt-1 h-1 rounded-full bg-line/50">
            <div className="h-1 rounded-full bg-faint" style={{ width: `${(t.previous / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="font-mono text-[10px] text-faint">
        <span className="text-accent">■</span> last 30 days <span className="ml-2">■</span> previous 30 days · counts of analyst-approved reports
      </p>
    </div>
  );
}
