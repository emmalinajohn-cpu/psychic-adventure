import { sql } from "../src/lib/db";
import { ALERT_CATEGORIES, maxPriority, type AlertCategory, type Priority } from "../src/lib/priority";
import { titleSimilarity } from "../src/lib/similarity";

// Two headlines this similar, about an overlapping country and theme within the
// window, are treated as reports of the same event.
export const SAME_EVENT_SIMILARITY = 0.4;
const WINDOW_HOURS = 72;

interface NewItem {
  id: number;
  title: string;
  at: Date;
  countries: string[];
  themes: string[];
  priority: Priority;
  alert_category: AlertCategory;
}

interface Candidate {
  id: number;
  titles: string[];
}

export function bestMatch(title: string, candidates: Candidate[]): { id: number; score: number } | null {
  let best: { id: number; score: number } | null = null;
  for (const c of candidates) {
    const score = Math.max(...c.titles.map((t) => titleSimilarity(title, t)));
    if (score >= SAME_EVENT_SIMILARITY && (!best || score > best.score)) best = { id: c.id, score };
  }
  return best;
}

async function refreshEvent(eventId: number) {
  // Corroboration: independent sources reporting the same event raise confidence
  await sql`
    with stats as (
      select count(distinct i.source_id)::int as sources,
             max(s.base_credibility) as best_credibility
      from event_items ei join items i on i.id = ei.item_id join sources s on s.id = i.source_id
      where ei.event_id = ${eventId}
    )
    update events e set
      source_count = stats.sources,
      confidence = least(100, stats.best_credibility + 5 * (stats.sources - 1))
    from stats where e.id = ${eventId}`;
  await sql`
    update item_analysis a set verification_status = 'corroborated'
    from event_items ei, events e
    where ei.item_id = a.item_id and e.id = ei.event_id and e.id = ${eventId}
      and e.source_count > 1 and a.verification_status = 'single_source'`;
}

async function ensureAlert(eventId: number, priority: Priority, category: AlertCategory, headline: string) {
  if (priority === "low") return;
  await sql`
    insert into alerts (event_id, priority, title, category, origin)
    values (${eventId}, ${priority}, ${headline}, ${ALERT_CATEGORIES[category].label}, 'rule')
    on conflict (event_id) do update set priority = excluded.priority`;
}

/** Attach every analysed item that has no event yet to an existing or new event. */
export async function groupIntoEvents(): Promise<{ joined: number; created: number }> {
  const items = await sql<NewItem[]>`
    select i.id, i.title, coalesce(i.published_at, i.fetched_at) as at,
           a.countries::text[] as countries, a.themes, a.priority, a.alert_category
    from items i
    join item_analysis a on a.item_id = i.id
    left join event_items ei on ei.item_id = i.id
    where ei.item_id is null and i.review_status <> 'discarded'
    order by at asc`;

  let joined = 0;
  let created = 0;
  for (const item of items) {
    const candidates = await sql<Candidate[]>`
      select e.id, array_agg(i.title) as titles
      from events e
      join event_items ei on ei.event_id = e.id
      join items i on i.id = ei.item_id
      where e.last_updated between ${item.at}::timestamptz - make_interval(hours => ${WINDOW_HOURS})
                               and ${item.at}::timestamptz + make_interval(hours => ${WINDOW_HOURS})
        and (e.countries && ${item.countries}::char(2)[] or (cardinality(e.countries) = 0 and ${item.countries.length} = 0))
        and e.themes && ${item.themes}::text[]
      group by e.id`;
    const match = bestMatch(item.title, candidates);

    if (match) {
      const [e] = await sql<{ priority: Priority; headline: string }[]>`select priority, headline from events where id = ${match.id}`;
      const priority = maxPriority(e.priority, item.priority);
      await sql`insert into event_items (item_id, event_id) values (${item.id}, ${match.id})`;
      await sql`
        update events set
          last_updated = greatest(last_updated, ${item.at}),
          countries = (select array_agg(distinct c) from unnest(countries || ${item.countries}::char(2)[]) c),
          themes = (select array_agg(distinct t) from unnest(themes || ${item.themes}::text[]) t),
          priority = ${priority}
        where id = ${match.id}`;
      await refreshEvent(match.id);
      await ensureAlert(match.id, priority, item.alert_category, e.headline);
      joined++;
    } else {
      const [e] = await sql<{ id: number }[]>`
        insert into events (headline, first_seen, last_updated, countries, themes, priority, confidence)
        select ${item.title}, ${item.at}, ${item.at}, ${item.countries}::char(2)[], ${item.themes}::text[], ${item.priority}, a.confidence
        from item_analysis a where a.item_id = ${item.id}
        returning id`;
      await sql`insert into event_items (item_id, event_id) values (${item.id}, ${e.id})`;
      await ensureAlert(e.id, item.priority, item.alert_category, item.title);
      created++;
    }
  }
  return { joined, created };
}
