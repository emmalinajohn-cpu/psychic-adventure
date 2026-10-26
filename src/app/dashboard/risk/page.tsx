import Link from "next/link";
import { COUNTRIES, THEMES } from "@/lib/reference";
import { BAND_COLOR, countryRisk, HALF_LIFE_DAYS, MIN_EVENTS, movement, PRIORITY_WEIGHT, WINDOW_DAYS, type Score } from "@/lib/risk";

export const metadata = { title: "Risk Assessment" };

const ARROW = { up: "▲", down: "▼", steady: "■" } as const;

function Cell({ s, strong }: { s: Score; strong?: boolean }) {
  if (s.score == null) {
    return <td className="px-2 py-2 text-center font-mono text-xs text-faint" title={`${s.events} approved events`}>·</td>;
  }
  const m = movement(s);
  const color = BAND_COLOR[s.band!];
  return (
    <td className="px-2 py-2 text-center font-mono text-xs" title={`${s.band} · ${s.events} events${s.previous != null ? ` · previous ${s.previous}` : ""}`}>
      <span className={`inline-block min-w-11 rounded px-1.5 py-0.5 ${strong ? "font-semibold" : ""}`} style={{ background: `${color}22`, color }}>
        {s.score}{m ? <span className="ml-1 text-[9px]">{ARROW[m]}</span> : null}
      </span>
    </td>
  );
}

export default async function RiskPage() {
  const risk = await countryRisk();
  const rows = COUNTRIES.map((c) => ({ c, r: risk.get(c.iso2)! })).sort(
    (a, b) => (b.r.overall.score ?? -1) - (a.r.overall.score ?? -1) || a.c.name.localeCompare(b.c.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Risk assessment</p>
        <h1 className="mt-1 text-2xl font-bold">Country and theme risk matrix</h1>
        <p className="mt-1 text-sm text-muted">Activity-based index from analyst-approved events over the last {WINDOW_DAYS} days. Arrows compare with the {WINDOW_DAYS} days before.</p>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-widest text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-2 py-3">Overall</th>
              {THEMES.map((t) => <th key={t.slug} className="px-2 py-3 font-normal normal-case tracking-normal">{t.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, r }) => (
              <tr key={c.iso2} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/countries/${c.iso2}`} className="hover:text-accent">{c.name}</Link>
                  <span className="block font-mono text-[10px] text-faint">{c.subregion}</span>
                </td>
                <Cell s={r.overall} strong />
                {THEMES.map((t) => <Cell key={t.slug} s={r.themes[t.slug]} />)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          {(Object.keys(BAND_COLOR) as (keyof typeof BAND_COLOR)[]).map((b) => (
            <span key={b} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: BAND_COLOR[b] }} />{b}</span>
          ))}
          <span>· insufficient data</span>
          <span>▲ rising ▼ falling ■ steady</span>
        </div>
      </div>

      <div className="panel p-5 text-sm leading-relaxed">
        <p className="eyebrow">Methodology</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
          <li>Only events with at least one analyst-approved report count. Pending and discarded items never affect a score.</li>
          <li>Each event adds its priority weight (high {PRIORITY_WEIGHT.high}, medium {PRIORITY_WEIGHT.medium}, low {PRIORITY_WEIGHT.low}) multiplied by its credibility score out of 100, halved every {HALF_LIFE_DAYS} days of age.</li>
          <li>The total is converted to 0–100 so the first serious events move a score quickly and it levels off near 100. Bands: Low under 25, Guarded 25–49, Elevated 50–74, High 75 and above.</li>
          <li>A score is withheld when a country or theme has fewer than {MIN_EVENTS} approved events in the window. A blank cell means not enough reporting, not low risk.</li>
          <li>The index measures the volume and seriousness of verified reporting. It supports, and does not replace, analyst judgement.</li>
        </ul>
      </div>
    </div>
  );
}
