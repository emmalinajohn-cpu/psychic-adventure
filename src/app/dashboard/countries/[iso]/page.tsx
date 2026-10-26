import { notFound } from "next/navigation";
import { FeedFilters } from "@/components/FeedFilters";
import { ItemCard } from "@/components/ItemCard";
import { Kpi } from "@/components/Kpi";
import { ThemeBars } from "@/components/ThemeBars";
import { feedFilter } from "@/lib/params";
import { approvedFeed, countrySummaries, themeTrends } from "@/lib/queries";
import { COUNTRY_BY_ISO } from "@/lib/reference";

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
  const [summary, trends, items] = await Promise.all([
    countrySummaries().then((all) => all.find((c) => c.iso2 === iso)!),
    themeTrends(iso),
    approvedFeed({ ...f, country: iso, limit: 60 }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{country.subregion} · {country.capital}</p>
        <h1 className="mt-1 text-3xl font-bold">{country.name}</h1>
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
