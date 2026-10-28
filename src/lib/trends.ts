import { sql } from "./db";
import { THEMES } from "./reference";

export interface TrendQuery {
  from: Date;
  to: Date;
  country?: string;
  subregion?: string;
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  theme: string;
  count: number;
}

export interface TrendResult {
  months: string[];
  series: Record<string, number[]>; // theme slug -> count per month
  current: Record<string, number>;
  previous: Record<string, number>;
  coverageStart: Date | null;
}

function scope(q: TrendQuery) {
  return sql`
    ${q.country ? sql`and ${q.country}::char(2) = any(a.countries)` : sql``}
    ${q.subregion ? sql`and exists (select 1 from countries c where c.iso2 = any(a.countries) and c.subregion = ${q.subregion})` : sql``}`;
}

export function monthsBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (d <= to) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/** Approved reporting per theme per month, plus totals against the preceding period of equal length. */
export async function trends(q: TrendQuery): Promise<TrendResult> {
  const span = q.to.getTime() - q.from.getTime();
  const prevFrom = new Date(q.from.getTime() - span);
  const [monthly, totals, coverage] = await Promise.all([
    sql<MonthlyPoint[]>`
      select to_char(date_trunc('month', coalesce(i.published_at, i.fetched_at)), 'YYYY-MM') as month, t as theme, count(*)::int as count
      from items i join item_analysis a on a.item_id = i.id, unnest(a.themes) t
      where i.review_status = 'approved' and coalesce(i.published_at, i.fetched_at) between ${q.from} and ${q.to} ${scope(q)}
      group by 1, 2`,
    sql<{ theme: string; current: number; previous: number }[]>`
      select t as theme,
        count(*) filter (where coalesce(i.published_at, i.fetched_at) >= ${q.from})::int as current,
        count(*) filter (where coalesce(i.published_at, i.fetched_at) < ${q.from})::int as previous
      from items i join item_analysis a on a.item_id = i.id, unnest(a.themes) t
      where i.review_status = 'approved' and coalesce(i.published_at, i.fetched_at) between ${prevFrom} and ${q.to} ${scope(q)}
      group by 1`,
    sql<{ at: Date | null }[]>`select min(coalesce(published_at, fetched_at)) as at from items where review_status = 'approved'`,
  ]);

  const months = monthsBetween(q.from, q.to);
  const index = new Map(months.map((m, i) => [m, i]));
  const series: Record<string, number[]> = {};
  const current: Record<string, number> = {};
  const previous: Record<string, number> = {};
  for (const t of THEMES) {
    series[t.slug] = months.map(() => 0);
    current[t.slug] = 0;
    previous[t.slug] = 0;
  }
  for (const p of monthly) {
    const i = index.get(p.month);
    if (i != null && series[p.theme]) series[p.theme][i] = p.count;
  }
  for (const r of totals) {
    if (r.theme in current) {
      current[r.theme] = r.current;
      previous[r.theme] = r.previous;
    }
  }
  return { months, series, current, previous, coverageStart: coverage[0].at };
}

/** Plain-language reading of the comparison, generated from the numbers only. */
export function narrative(r: TrendResult, names: Map<string, string>, periodLabel: string): string[] {
  const lines: string[] = [];
  const total = Object.values(r.current).reduce((a, b) => a + b, 0);
  const prevTotal = Object.values(r.previous).reduce((a, b) => a + b, 0);
  if (total === 0) return [`No approved reporting in the selected ${periodLabel}.`];
  lines.push(
    prevTotal === 0
      ? `${total} approved reports in the selected ${periodLabel}; there is no approved reporting in the preceding period to compare against.`
      : `${total} approved reports in the selected ${periodLabel}, ${total >= prevTotal ? "up" : "down"} ${Math.abs(Math.round(((total - prevTotal) / prevTotal) * 100))}% on the preceding period (${prevTotal}).`,
  );
  const ranked = Object.entries(r.current).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (ranked.length) lines.push(`Most reported: ${ranked.slice(0, 3).map(([t, n]) => `${names.get(t)} (${n})`).join(", ")}.`);
  const movers = Object.keys(r.current)
    .filter((t) => r.previous[t] >= 3)
    .map((t) => ({ t, pct: Math.round(((r.current[t] - r.previous[t]) / r.previous[t]) * 100) }))
    .filter((m) => Math.abs(m.pct) >= 25)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  for (const m of movers.slice(0, 3)) lines.push(`${names.get(m.t)} reporting ${m.pct > 0 ? "rose" : "fell"} ${Math.abs(m.pct)}% against the preceding period.`);
  const emerging = Object.keys(r.current).filter((t) => r.current[t] >= 3 && r.previous[t] === 0);
  if (emerging.length) lines.push(`New activity with no approved reporting in the preceding period: ${emerging.map((t) => names.get(t)).join(", ")}.`);
  return lines;
}
