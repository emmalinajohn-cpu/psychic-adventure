import { notFound } from "next/navigation";
import { FeedFilters } from "@/components/FeedFilters";
import { ItemCard } from "@/components/ItemCard";
import { Kpi } from "@/components/Kpi";
import { ThemeBars } from "@/components/ThemeBars";
import { feedFilter } from "@/lib/params";
import { approvedFeed, countrySummaries, themeTrends } from "@/lib/queries";
import { COUNTRY_BY_ISO, THEMES } from "@/lib/reference";
import { BAND_COLOR, countryRisk, movement, WINDOW_DAYS } from "@/lib/risk";

export default async function CountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ iso: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const iso = (await params).iso.toUpperCase();
  const country = COUNTRY_BY_ISO.get(iso);
  if (!country) notFound();
  const f = feedFilter(await searchParams);
  const [summary, trends, items, risk] = await Promise.all([
    countrySummaries().then((all) => all.find((c) => c.iso2 === iso)!),
    themeTrends(iso),
    approvedFeed({ ...f, country: iso, limit: 60 }),
    countryRisk().then((all) => all.get(iso)!),
  ]);
  const arrow = { up: "▲", down: "▼", steady: "■" } as const;
  const overallMove = movement(risk.overall);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{country.subregion} · {country.capital}</p>
        <h1 className="mt-1 text-3xl font-bold">{country.name}</h1>
      </div>
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Risk index · {WINDOW_DAYS} days</p>
            {risk.overall.score != null ? (
              <p className="mt-2 text-4xl font-semibold" style={{ color: BAND_COLOR[risk.overall.band!] }}>
                {risk.overall.score}
                <span className="ml-3 align-middle font-mono text-xs uppercase tracking-widest">
                  {risk.overall.band} {overallMove ? arrow[overallMove] : ""}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Insufficient data: {risk.overall.events} approved event{risk.overall.events === 1 ? "" : "s"} in the window.</p>
            )}
          </div>
          <a href="/dashboard/risk" className="btn">Risk matrix →</a>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => {
            const s = risk.themes[t.slug];
            const m = movement(s);
            return (
              <div key={t.slug} className="rounded-lg border border-line px-3 py-2">
                <p className="text-xs text-muted">{t.name}</p>
                <p className="mt-0.5 font-mono text-sm" style={{ color: s.band ? BAND_COLOR[s.band] : undefined }}>
                  {s.score != null ? `${s.score} · ${s.band}${m ? ` ${arrow[m]}` : ""}` : <span className="text-faint">insufficient data</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Reports · 30 days" value={summary.items_30d} />
        <Kpi label="High priority · 30 days" value={summary.high_30d} />
        <Kpi label="Most reported theme · 90 days" value={<span className="text-xl">{summary.top_theme ?? "None yet"}</span>} />
      </div>
      <div className="panel p-5">
        <p className="eyebrow">Reporting by theme</p>
        <div className="mt-4"><ThemeBars trends={trends} /></div>
      </div>
      <FeedFilters action={`/dashboard/countries/${iso}`} values={{ ...f }} hide={["country"]} />
      <div className="space-y-3">
        <p className="eyebrow">Key developments</p>
        {items.length ? items.map((i) => <ItemCard key={i.id} item={i} showAnalyst />) : <p className="panel px-5 py-8 text-center text-sm text-muted">No approved reporting for {country.name} yet.</p>}
      </div>
    </div>
  );
}
