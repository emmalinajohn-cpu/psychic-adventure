import { createHash } from "node:crypto";
import { sql } from "../src/lib/db";
import { isPacificRelevant } from "../src/lib/match";
import { parseFeed, parseGuardian, type FeedEntry } from "./feeds";

const USER_AGENT = "PacificWatchmenBot/1.0 (+https://github.com/emmalinajohn-cpu/psychic-adventure)";

interface SourceRow {
  id: number;
  slug: string;
  name: string;
  feed_url: string;
  feed_type: "rss" | "guardian" | "reliefweb";
  pacific_focused: boolean;
}

async function fetchEntries(source: SourceRow): Promise<FeedEntry[]> {
  let url = source.feed_url;
  if (source.feed_type === "guardian") {
    const key = process.env.GUARDIAN_API_KEY;
    if (!key) throw new Error("GUARDIAN_API_KEY is not set");
    url = `${source.feed_url}?show-fields=trailText,byline&page-size=50&order-by=newest&api-key=${encodeURIComponent(key)}`;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, application/json;q=0.9, */*;q=0.5" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (source.feed_type === "guardian") return parseGuardian(await res.json());
  return parseFeed(await res.text());
}

export function contentHash(e: Pick<FeedEntry, "title" | "description">): string {
  return createHash("sha256").update(`${e.title}\n${e.description ?? ""}`).digest("hex");
}

/** Fetch one source and store entries we haven't seen. Returns the number of new items. */
export async function collectSource(source: SourceRow): Promise<number> {
  const [run] = await sql<{ id: number }[]>`insert into fetch_runs (source_id) values (${source.id}) returning id`;
  try {
    const entries = await fetchEntries(source);
    const relevant = source.pacific_focused
      ? entries
      : entries.filter((e) => isPacificRelevant(`${e.title} ${e.description ?? ""}`));
    let added = 0;
    for (const e of relevant) {
      const hash = contentHash(e);
      // Same text already stored from another URL (syndication): skip as a duplicate
      const rows = await sql`
        insert into items (source_id, url, title, description, author, published_at, content_hash, geo_lat, geo_lon)
        select ${source.id}, ${e.url}, ${e.title}, ${e.description}, ${e.author}, ${e.publishedAt}, ${hash}, ${e.lat ?? null}, ${e.lon ?? null}
        where not exists (select 1 from items where content_hash = ${hash})
        on conflict (url) do nothing
        returning id`;
      added += rows.length;
    }
    await sql`
      update fetch_runs set finished_at = now(), status = 'ok', items_found = ${entries.length}, items_new = ${added}
      where id = ${run.id}`;
    return added;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`update fetch_runs set finished_at = now(), status = 'error', error = ${message} where id = ${run.id}`;
    throw err;
  }
}

export async function collectAll(): Promise<{ source: string; added?: number; error?: string }[]> {
  const sources = await sql<SourceRow[]>`
    select id, slug, name, feed_url, feed_type, pacific_focused from sources where active order by id`;
  return Promise.all(
    sources.map(async (s) => {
      if (s.feed_type === "guardian" && !process.env.GUARDIAN_API_KEY) return { source: s.slug, error: "skipped: no GUARDIAN_API_KEY" };
      try {
        return { source: s.slug, added: await collectSource(s) };
      } catch (err) {
        return { source: s.slug, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
}
