import Link from "next/link";
import { CountryList, PriorityBadge } from "@/components/Badges";
import { Freshness } from "@/components/Freshness";
import { ItemCard } from "@/components/ItemCard";
import { Kpi } from "@/components/Kpi";
import { ThemeBars } from "@/components/ThemeBars";
import { formatDateTime } from "@/lib/format";
import { activeAlerts, approvedFeed, countrySummaries, lastCollection, themeTrends, totals } from "@/lib/queries";

export default async function Overview() {
  const [t, trends, alerts, latest, countries, last] = await Promise.all([
    totals(), themeTrends(), activeAlerts(8), approvedFeed({ limit: 6 }), countrySummaries(), lastCollection(),
  ]);
  const busiest = [...countries].sort((a, b) => b.items_30d - a.items_30d).filter((c) => c.items_30d > 0).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Intelligence dashboard</p>
          <h1 className="mt-1 text-2xl font-bold">Regional overview</h1>
        </div>
        <Freshness initial={last?.toISOString() ?? null} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Verified reports · 30 days" value={t.approved_30d} sub={`${t.approved_items} in total`} />
        <Kpi label="Awaiting review" value={<Link href="/dashboard/review" className="hover:text-accent">{t.pending_review}</Link>} />
        <Kpi label="Active alerts" value={t.active_alerts} />
        <Kpi label="Countries reported on · 30 days" value={`${t.countries_with_reports_30d} / 22`} sub={`${t.sources_active} sources monitored`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="panel p-5">
          <p className="eyebrow">Reporting by theme</p>
          <div className="mt-4"><ThemeBars trends={trends} /></div>
        </div>
        <div className="panel p-5">
          <p className="eyebrow">Latest alerts</p>
          {alerts.length ? (
            <ul className="mt-3 divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center gap-2"><PriorityBadge priority={a.priority} /><span className="text-xs text-muted">{a.category}</span></div>
                  <p className="mt-1 text-sm">{a.title}</p>
                  <p className="mt-0.5 text-xs text-faint"><CountryList countries={a.countries} /> · {formatDateTime(a.last_updated)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No active alerts from approved reporting.</p>
          )}
          <Link href="/dashboard/alerts" className="mt-2 inline-block text-sm text-accent">Alert centre →</Link>
        </div>
      </div>

      <div className="panel p-5">
        <p className="eyebrow">Most reported countries · 30 days</p>
        {busiest.length ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left font-mono text-[11px] uppercase tracking-widest text-faint">
              <tr><th className="py-2">Country</th><th>Subregion</th><th className="text-right">Reports</th><th className="text-right">High priority</th><th className="pl-4">Most reported theme</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {busiest.map((c) => (
                <tr key={c.iso2}>
                  <td className="py-2"><Link href={`/dashboard/countries/${c.iso2}`} className="hover:text-accent">{c.name}</Link></td>
                  <td className="text-muted">{c.subregion}</td>
                  <td className="text-right font-mono">{c.items_30d}</td>
                  <td className="text-right font-mono text-high">{c.high_30d || ""}</td>
                  <td className="pl-4 text-muted">{c.top_theme ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-muted">No approved reports in the last 30 days.</p>
        )}
      </div>

      <div>
        <p className="eyebrow">Latest verified reporting</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {latest.length ? latest.map((i) => <ItemCard key={i.id} item={i} showAnalyst />) : <p className="text-sm text-muted">Nothing approved yet. Start in the review queue.</p>}
        </div>
      </div>
    </div>
  );
}
