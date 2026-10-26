import { sql } from "./db";
import { COUNTRIES, THEMES } from "./reference";

// Activity-based risk index, 0-100, per country and theme.
//
// Every event with at least one analyst-approved report contributes
//   weight(priority) x confidence/100 x 0.5^(age in days / HALF_LIFE_DAYS)
// to the countries and themes it is tagged with. The sum S becomes a score with
//   score = 100 x (1 - e^(-S / SATURATION))
// so the first serious events move the score quickly and it levels off toward 100.
// "Current" covers the last WINDOW_DAYS; "previous" is the window before it, scored
// as of its own end date, which gives the movement indicator.

export const WINDOW_DAYS = 90;
export const HALF_LIFE_DAYS = 30;
export const PRIORITY_WEIGHT = { high: 10, medium: 4, low: 1 } as const;
export const SATURATION = 20;
/** Fewer approved events than this in the window and the score is withheld. */
export const MIN_EVENTS = 3;

export type Band = "Low" | "Guarded" | "Elevated" | "High";

export function scoreFrom(sum: number): number {
  return Math.round(100 * (1 - Math.exp(-sum / SATURATION)));
}

export function band(score: number): Band {
  if (score >= 75) return "High";
  if (score >= 50) return "Elevated";
  if (score >= 25) return "Guarded";
  return "Low";
}

export const BAND_COLOR: Record<Band, string> = {
  Low: "#34d399",
  Guarded: "#60a5fa",
  Elevated: "#fbbf24",
  High: "#f87171",
};

export interface Score {
  score: number | null; // null = insufficient data
  previous: number | null;
  events: number;
  previousEvents: number;
  band: Band | null;
}

export interface CountryRisk {
  iso2: string;
  overall: Score;
  themes: Record<string, Score>;
}

interface Row {
  iso2: string;
  theme: string; // '*' = all themes
  window: "current" | "previous";
  weighted: number;
  events: number;
}

function toScore(cur?: Row, prev?: Row): Score {
  const events = cur?.events ?? 0;
  const previousEvents = prev?.events ?? 0;
  const score = events >= MIN_EVENTS ? scoreFrom(cur!.weighted) : null;
  const previous = previousEvents >= MIN_EVENTS ? scoreFrom(prev!.weighted) : null;
  return { score, previous, events, previousEvents, band: score == null ? null : band(score) };
}

/** Risk for every country, overall and per theme. */
export async function countryRisk(asOf = new Date()): Promise<Map<string, CountryRisk>> {
  const rows = await sql<Row[]>`
    with approved_events as (
      select e.id, e.countries, e.themes, e.priority, e.confidence, e.last_updated
      from events e
      where exists (select 1 from event_items ei join items i on i.id = ei.item_id
                    where ei.event_id = e.id and i.review_status = 'approved')
    ),
    windows as (
      select 'current' as "window", ${asOf}::timestamptz as ends
      union all
      select 'previous', ${asOf}::timestamptz - make_interval(days => ${WINDOW_DAYS}::int)
    ),
    contributions as (
      select w."window", c as iso2, t as theme, ev.id,
        (case ev.priority when 'high' then ${PRIORITY_WEIGHT.high}::int when 'medium' then ${PRIORITY_WEIGHT.medium}::int else ${PRIORITY_WEIGHT.low}::int end)
          * ev.confidence / 100.0
          * power(0.5, extract(epoch from (w.ends - ev.last_updated)) / 86400.0 / ${HALF_LIFE_DAYS}::int) as weight
      from approved_events ev
      cross join windows w
      cross join lateral unnest(ev.countries) c
      cross join lateral unnest(ev.themes) t
      where ev.last_updated <= w.ends and ev.last_updated > w.ends - make_interval(days => ${WINDOW_DAYS}::int)
    )
    select iso2::text, theme, "window", sum(weight)::float8 as weighted, count(distinct id)::int as events
    from contributions group by iso2, theme, "window"
    union all
    -- Overall: each event counted once per country, not once per theme
    select iso2::text, '*', "window", sum(weight)::float8, count(*)::int
    from (select distinct on ("window", iso2, id) "window", iso2, id, weight from contributions) d
    group by iso2, "window"`;

  const key = (r: Pick<Row, "iso2" | "theme" | "window">) => `${r.iso2}|${r.theme}|${r.window}`;
  const byKey = new Map(rows.map((r) => [key(r), r]));
  const get = (iso2: string, theme: string, window: Row["window"]) => byKey.get(key({ iso2, theme, window }));

  const out = new Map<string, CountryRisk>();
  for (const c of COUNTRIES) {
    const themes: Record<string, Score> = {};
    for (const t of THEMES) themes[t.slug] = toScore(get(c.iso2, t.slug, "current"), get(c.iso2, t.slug, "previous"));
    out.set(c.iso2, { iso2: c.iso2, overall: toScore(get(c.iso2, "*", "current"), get(c.iso2, "*", "previous")), themes });
  }
  return out;
}

export function movement(s: Score): "up" | "down" | "steady" | null {
  if (s.score == null || s.previous == null) return null;
  if (s.score - s.previous >= 5) return "up";
  if (s.previous - s.score >= 5) return "down";
  return "steady";
}
