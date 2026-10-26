import { sql } from "./db";
import type { Priority } from "./priority";

// Only approved items ever reach a page. Public pages additionally only show
// items an analyst marked public; aggregates (counts) use all approved items.

export interface ItemRow {
  id: number;
  title: string;
  url: string;
  published_at: Date | null;
  fetched_at: Date;
  source_name: string;
  source_kind: string;
  countries: string[] | null;
  themes: string[] | null;
  priority: Priority | null;
  alert_category: string | null;
  executive_summary: string | null;
  analyst_summary: string | null;
  confidence: number | null;
  verification_status: string | null;
  is_commentary: boolean | null;
  review_status: "pending" | "approved" | "discarded";
  is_public: boolean;
  event_id: number | null;
  event_source_count: number | null;
}

const ITEM_COLUMNS = sql`
  i.id, i.title, i.url, i.published_at, i.fetched_at, i.review_status, i.is_public,
  s.name as source_name, s.kind as source_kind,
  a.countries::text[] as countries, a.themes, a.priority, a.alert_category, a.executive_summary, a.analyst_summary,
  a.confidence, a.verification_status, a.is_commentary,
  ei.event_id, e.source_count as event_source_count`;

const ITEM_JOINS = sql`
  from items i
  join sources s on s.id = i.source_id
  left join item_analysis a on a.item_id = i.id
  left join event_items ei on ei.item_id = i.id
  left join events e on e.id = ei.event_id`;

// Authoritative sources first, then newest
const ITEM_ORDER = sql`order by coalesce(i.published_at, i.fetched_at) desc, a.confidence desc nulls last`;

export async function lastCollection(): Promise<Date | null> {
  const [r] = await sql<{ at: Date | null }[]>`select max(finished_at) as at from fetch_runs where status = 'ok'`;
  return r.at;
}

export interface ThemeTrend {
  slug: string;
  name: string;
  current: number;
  previous: number;
}

/** Approved items per theme: last 30 days against the 30 days before. */
export async function themeTrends(countryIso?: string): Promise<ThemeTrend[]> {
  return sql<ThemeTrend[]>`
    select t.slug, t.name,
      count(i.id) filter (where coalesce(i.published_at, i.fetched_at) >= now() - interval '30 days')::int as current,
      count(i.id) filter (where coalesce(i.published_at, i.fetched_at) <  now() - interval '30 days'
                          and coalesce(i.published_at, i.fetched_at) >= now() - interval '60 days')::int as previous
    from themes t
    left join item_analysis a on t.slug = any(a.themes) ${countryIso ? sql`and ${countryIso}::char(2) = any(a.countries)` : sql``}
    left join items i on i.id = a.item_id and i.review_status = 'approved'
    group by t.slug, t.name, t.sort_order
    order by t.sort_order`;
}

export interface Totals {
  approved_items: number;
  approved_30d: number;
  pending_review: number;
  public_briefs: number;
  active_alerts: number;
  sources_active: number;
  countries_with_reports_30d: number;
}

export async function totals(): Promise<Totals> {
  const [r] = await sql<Totals[]>`
    select
      (select count(*) from items where review_status = 'approved')::int as approved_items,
      (select count(*) from items where review_status = 'approved' and coalesce(published_at, fetched_at) >= now() - interval '30 days')::int as approved_30d,
      (select count(*) from items where review_status = 'pending')::int as pending_review,
      (select count(*) from items where review_status = 'approved' and is_public)::int as public_briefs,
      (select count(distinct al.id) from alerts al join event_items ei on ei.event_id = al.event_id
         join items i on i.id = ei.item_id and i.review_status = 'approved' where al.status = 'active')::int as active_alerts,
      (select count(*) from sources where active)::int as sources_active,
      (select count(distinct c) from items i join item_analysis a on a.item_id = i.id, unnest(a.countries) c
         where i.review_status = 'approved' and coalesce(i.published_at, i.fetched_at) >= now() - interval '30 days')::int as countries_with_reports_30d`;
  return r;
}

export interface CountrySummary {
  iso2: string;
  name: string;
  subregion: string;
  capital: string;
  lat: number;
  lon: number;
  items_30d: number;
  high_30d: number;
  items_total: number;
  top_theme: string | null;
  latest_at: Date | null;
}

export async function countrySummaries(): Promise<CountrySummary[]> {
  return sql<CountrySummary[]>`
    with approved as (
      select i.id, coalesce(i.published_at, i.fetched_at) as at, a.countries, a.themes, a.priority
      from items i join item_analysis a on a.item_id = i.id where i.review_status = 'approved'
    ),
    per_theme as (
      select c.iso2, t as theme, count(*) as n,
             row_number() over (partition by c.iso2 order by count(*) desc, t) as rn
      from countries c join approved ap on c.iso2 = any(ap.countries), unnest(ap.themes) t
      where ap.at >= now() - interval '90 days'
      group by c.iso2, t
    )
    select c.iso2, c.name, c.subregion, c.capital, c.lat, c.lon,
      count(ap.id) filter (where ap.at >= now() - interval '30 days')::int as items_30d,
      count(ap.id) filter (where ap.at >= now() - interval '30 days' and ap.priority = 'high')::int as high_30d,
      count(ap.id)::int as items_total,
      (select th.name from per_theme pt join themes th on th.slug = pt.theme where pt.iso2 = c.iso2 and pt.rn = 1) as top_theme,
      max(ap.at) as latest_at
    from countries c
    left join approved ap on c.iso2 = any(ap.countries)
    group by c.iso2
    order by c.name`;
}

export async function publicBriefs(limit = 30): Promise<ItemRow[]> {
  return sql<ItemRow[]>`select ${ITEM_COLUMNS} ${ITEM_JOINS}
    where i.review_status = 'approved' and i.is_public ${ITEM_ORDER} limit ${limit}`;
}

export async function publicSignals(limit = 6): Promise<ItemRow[]> {
  return sql<ItemRow[]>`select ${ITEM_COLUMNS} ${ITEM_JOINS}
    where i.review_status = 'approved' and i.is_public and a.priority in ('high', 'medium') ${ITEM_ORDER} limit ${limit}`;
}

export interface FeedFilter {
  country?: string;
  theme?: string;
  priority?: Priority;
  q?: string;
  limit?: number;
}

export async function approvedFeed(f: FeedFilter = {}): Promise<ItemRow[]> {
  return sql<ItemRow[]>`select ${ITEM_COLUMNS} ${ITEM_JOINS}
    where i.review_status = 'approved'
      ${f.country ? sql`and ${f.country}::char(2) = any(a.countries)` : sql``}
      ${f.theme ? sql`and ${f.theme} = any(a.themes)` : sql``}
      ${f.priority ? sql`and a.priority = ${f.priority}` : sql``}
      ${f.q ? sql`and i.search @@ websearch_to_tsquery('english', ${f.q})` : sql``}
    ${ITEM_ORDER} limit ${f.limit ?? 50}`;
}

export async function reviewQueue(limit = 100): Promise<(ItemRow & { failure: string | null })[]> {
  return sql<(ItemRow & { failure: string | null })[]>`select ${ITEM_COLUMNS}, f.last_error as failure ${ITEM_JOINS}
    left join analysis_failures f on f.item_id = i.id
    where i.review_status = 'pending'
    order by (a.priority = 'high') desc nulls last, coalesce(i.published_at, i.fetched_at) desc
    limit ${limit}`;
}

export interface AlertRow {
  id: number;
  priority: Priority;
  title: string;
  category: string;
  created_at: Date;
  countries: string[];
  source_count: number;
  last_updated: Date;
}

export async function activeAlerts(limit = 20): Promise<AlertRow[]> {
  return sql<AlertRow[]>`
    select al.id, al.priority, al.title, al.category, al.created_at, e.countries::text[] as countries, e.source_count, e.last_updated
    from alerts al join events e on e.id = al.event_id
    where al.status = 'active'
      and exists (select 1 from event_items ei join items i on i.id = ei.item_id where ei.event_id = e.id and i.review_status = 'approved')
    order by (al.priority = 'high') desc, e.last_updated desc
    limit ${limit}`;
}

export interface SourceStatus {
  id: number;
  name: string;
  kind: string;
  homepage: string;
  base_credibility: number;
  active: boolean;
  last_run: Date | null;
  last_status: string | null;
  last_error: string | null;
  items_total: number;
}

export async function sourceStatuses(): Promise<SourceStatus[]> {
  return sql<SourceStatus[]>`
    select s.id, s.name, s.kind, s.homepage, s.base_credibility, s.active,
      r.finished_at as last_run, r.status as last_status, r.error as last_error,
      (select count(*) from items i where i.source_id = s.id)::int as items_total
    from sources s
    left join lateral (select * from fetch_runs fr where fr.source_id = s.id order by started_at desc limit 1) r on true
    order by s.kind, s.name`;
}

export interface MapItemRow {
  id: number;
  title: string;
  url: string;
  at: Date;
  source_name: string;
  countries: string[];
  map_layers: string[];
  location_name: string | null;
  priority: Priority;
  confidence: number;
  verification_status: string;
  executive_summary: string;
  geo_lat: number | null;
  geo_lon: number | null;
}

/** Approved items that belong on at least one map layer, newest first. */
export async function mapItems(days: number): Promise<MapItemRow[]> {
  return sql<MapItemRow[]>`
    select i.id, i.title, i.url, coalesce(i.published_at, i.fetched_at) as at, s.name as source_name,
      a.countries::text[] as countries, a.map_layers, a.location_name, a.priority, a.confidence, a.verification_status,
      a.executive_summary, i.geo_lat, i.geo_lon
    from items i join sources s on s.id = i.source_id join item_analysis a on a.item_id = i.id
    where i.review_status = 'approved' and cardinality(a.map_layers) > 0
      and coalesce(i.published_at, i.fetched_at) >= now() - make_interval(days => ${days}::int)
    order by at desc
    limit 1000`;
}
