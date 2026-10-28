import { LineChart, THEME_COLORS } from "@/components/LineChart";
import { formatDate } from "@/lib/format";
import { COUNTRIES, COUNTRY_BY_ISO, THEMES, type Subregion } from "@/lib/reference";
import { narrative, trends } from "@/lib/trends";

export const metadata = { title: "Trend Analysis" };

const PRESETS = { "1y": 1, "3y": 3, "5y": 5 } as const;
const SUBREGIONS: Subregion[] = ["Melanesia", "Micronesia", "Polynesia"];

type Params = Record<string, string | string[] | undefined>;

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolvePeriod(p: Params, now: Date) {
  const from = parseDate(p.from);
  const to = parseDate(p.to);
  if (p.period === "custom" && from && to && from < to) {
    return { key: "custom", from, to: new Date(Math.min(to.getTime() + 86_399_999, now.getTime())), label: "period" };
  }
  const key = typeof p.period === "string" && p.period in PRESETS ? (p.period as keyof typeof PRESETS) : "1y";
  const years = PRESETS[key];
  const start = new Date(now);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  return { key, from: start, to: now, label: years === 1 ? "year" : `${years} years` };
}

function pct(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? <span className="text-faint">no reports</span> : <span className="text-medium">new activity</span>;
  const v = Math.round(((cur - prev) / prev) * 100);
  if (v === 0) return <span className="text-muted">unchanged</span>;
  return <span className={v > 0 ? "text-high" : "text-good"}>{v > 0 ? "▲" : "▼"} {Math.abs(v)}%</span>;
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const now = new Date();
  const period = resolvePeriod(p, now);
  const country = typeof p.country === "string" && COUNTRY_BY_ISO.has(p.country.toUpperCase()) ? p.country.toUpperCase() : undefined;
  const subregion = !country && SUBREGIONS.includes(p.subregion as Subregion) ? (p.subregion as Subregion) : undefined;

  const r = await trends({ from: period.from, to: period.to, country, subregion });
  const names = new Map(THEMES.map((t) => [t.slug, t.name]));
  const scopeLabel = country ? COUNTRY_BY_ISO.get(country)!.name : subregion ?? "All 22 PICTs";
  const gap = r.coverageStart == null || r.coverageStart > period.from;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Trend analysis</p>
        <h1 className="mt-1 text-2xl font-bold">Security trends · {scopeLabel}</h1>
        <p className="mt-1 text-sm text-muted">
          Analyst-approved reports per theme per month, {formatDate(period.from)} to {formatDate(period.to)}, compared with the preceding period of equal length.
        </p>
      </div>

      <form className="panel flex flex-wrap items-end gap-3 p-4 text-sm" action="/dashboard/trends">
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Period</span>
          <select name="period" defaultValue={period.key} className="input">
            <option value="1y">Last year</option>
            <option value="3y">Last 3 years</option>
            <option value="5y">Last 5 years</option>
            <option value="custom">Custom range</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">From (custom)</span>
          <input type="date" name="from" defaultValue={iso(period.from)} className="input" />
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">To (custom)</span>
          <input type="date" name="to" defaultValue={iso(period.to)} className="input" />
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Subregion</span>
          <select name="subregion" defaultValue={subregion ?? ""} className="input">
            <option value="">All</option>
            {SUBREGIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Country</span>
          <select name="country" defaultValue={country ?? ""} className="input">
            <option value="">All</option>
            {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" type="submit">Apply</button>
      </form>

      {gap ? (
        <p className="panel border-medium/40 px-4 py-3 text-sm text-medium">
          {r.coverageStart
            ? `Collection began ${formatDate(r.coverageStart)}. Months before that show no reports because nothing was collected yet, not because nothing happened. Historical backfill is needed for a true comparison.`
            : "No approved reporting has been collected yet, so there is nothing to chart."}
        </p>
      ) : null}

      <div className="panel p-5">
        <p className="eyebrow">Reports per month by theme</p>
        <div className="mt-4">
          <LineChart
            months={r.months}
            series={THEMES.map((t) => ({ key: t.slug, label: t.name, color: THEME_COLORS[t.slug] ?? "#8a9bb0", values: r.series[t.slug] }))}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="panel overflow-x-auto p-5">
          <p className="eyebrow">Historical comparison</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr><th className="py-2">Theme</th><th className="text-right">This {period.label}</th><th className="text-right">Preceding</th><th className="text-right">Change</th></tr>
            </thead>
            <tbody>
              {THEMES.map((t) => (
                <tr key={t.slug} className="border-t border-line">
                  <td className="py-2">{t.name}</td>
                  <td className="text-right font-mono">{r.current[t.slug]}</td>
                  <td className="text-right font-mono text-muted">{r.previous[t.slug]}</td>
                  <td className="text-right font-mono text-xs">{pct(r.current[t.slug], r.previous[t.slug])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Reading</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
            {narrative(r, names, period.label).map((l) => <li key={l}>{l}</li>)}
          </ul>
          <p className="mt-4 font-mono text-[10px] text-faint">Generated from the counts above. Reporting volume reflects coverage as well as activity.</p>
        </div>
      </div>
    </div>
  );
}
