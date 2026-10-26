import { PacificMap, type MapCountry, type MapPin } from "@/components/PacificMap";
import { project, spiralOffset, pacificProjection, MAP_HEIGHT, MAP_WIDTH } from "@/lib/geo";
import { mapItems } from "@/lib/queries";
import { COUNTRIES, COUNTRY_BY_ISO, THEMES } from "@/lib/reference";
import { countryRisk, movement } from "@/lib/risk";

export const metadata = { title: "Pacific Security Map" };

const PERIODS = [30, 90, 365] as const;

export default async function MapPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const requested = Number((await searchParams).days);
  const days = (PERIODS as readonly number[]).includes(requested) ? requested : 90;
  const [items, risk] = await Promise.all([mapItems(days), countryRisk()]);

  const countries: MapCountry[] = COUNTRIES.map((c) => {
    const r = risk.get(c.iso2)!;
    const [x, y] = project(c.lon, c.lat) ?? [-100, -100];
    const priorities = THEMES.map((t) => ({ name: t.name, s: r.themes[t.slug] }))
      .filter((t) => t.s.score != null)
      .sort((a, b) => b.s.score! - a.s.score!)
      .slice(0, 3)
      .map((t) => ({ name: t.name, score: t.s.score!, movement: movement(t.s) }));
    return {
      iso2: c.iso2, name: c.name, subregion: c.subregion, x, y,
      score: r.overall.score, band: r.overall.band, events: r.overall.events, movement: movement(r.overall), priorities,
    };
  });

  // Exact coordinates when the source published them; otherwise an indicative pin
  // around the capital of each country the item is about.
  const perCountry = new Map<string, number>();
  const pins: MapPin[] = [];
  for (const it of items) {
    const base = { id: it.id, title: it.title, url: it.url, at: it.at.toISOString(), source: it.source_name, layers: it.map_layers,
      location: it.location_name, priority: it.priority, confidence: it.confidence, verification: it.verification_status, summary: it.executive_summary };
    const exact = it.geo_lat != null && it.geo_lon != null ? project(it.geo_lon, it.geo_lat) : null;
    if (exact) {
      pins.push({ ...base, key: `${it.id}`, x: exact[0], y: exact[1], precision: "exact", country: it.countries[0] ?? null });
      continue;
    }
    for (const iso of it.countries) {
      const c = COUNTRY_BY_ISO.get(iso);
      const p = c && project(c.lon, c.lat);
      if (!p) continue;
      const n = perCountry.get(iso) ?? 0;
      perCountry.set(iso, n + 1);
      const [dx, dy] = spiralOffset(n + 1);
      pins.push({ ...base, key: `${it.id}-${iso}`, x: p[0] + dx, y: p[1] + dy, precision: "country", country: iso });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Interactive Pacific map</p>
          <h1 className="mt-1 text-2xl font-bold">Pacific security map</h1>
          <p className="mt-1 text-sm text-muted">Country risk index and approved reporting by layer, last {days} days.</p>
        </div>
        <div className="flex gap-1 text-sm">
          {PERIODS.map((p) => (
            <a key={p} href={`/dashboard/map?days=${p}`} className={`btn ${p === days ? "border-accent text-accent" : ""}`}>
              {p === 365 ? "1 year" : `${p} days`}
            </a>
          ))}
        </div>
      </div>
      <PacificMap width={MAP_WIDTH} height={MAP_HEIGHT} land={pacificProjection().land} countries={countries} pins={pins} />
    </div>
  );
}
