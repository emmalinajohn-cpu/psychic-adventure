// Applies pending SQL migrations in db/migrations, then upserts reference data
// (countries, themes) and inserts any seed sources that don't exist yet.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "../src/lib/db";
import { COUNTRIES, THEMES } from "../src/lib/reference";
import { SOURCE_SEEDS } from "../src/lib/sources";

const dir = path.join(process.cwd(), "db", "migrations");

async function main() {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql<{ name: string }[]>`select name from schema_migrations`).map((r) => r.name));
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into schema_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
  }

  for (const c of COUNTRIES) {
    await sql`
      insert into countries (iso2, name, subregion, capital, lat, lon, aliases)
      values (${c.iso2}, ${c.name}, ${c.subregion}, ${c.capital}, ${c.lat}, ${c.lon}, ${c.aliases})
      on conflict (iso2) do update set name = excluded.name, subregion = excluded.subregion, capital = excluded.capital,
        lat = excluded.lat, lon = excluded.lon, aliases = excluded.aliases`;
  }
  for (const [i, t] of THEMES.entries()) {
    await sql`
      insert into themes (slug, name, sort_order) values (${t.slug}, ${t.name}, ${i})
      on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order`;
  }
  for (const s of SOURCE_SEEDS) {
    await sql`
      insert into sources (slug, name, kind, homepage, feed_url, feed_type, country_iso, base_credibility, pacific_focused, active)
      values (${s.slug}, ${s.name}, ${s.kind}, ${s.homepage}, ${s.feedUrl}, ${s.feedType}, ${s.countryIso ?? null},
        ${s.baseCredibility}, ${s.pacificFocused}, ${s.active})
      on conflict (slug) do nothing`;
  }
  console.log("reference data and sources up to date");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
