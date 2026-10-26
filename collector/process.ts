import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { sql } from "../src/lib/db";
import { matchCountries } from "../src/lib/match";
import { ALERT_CATEGORIES, ALERT_CATEGORY_KEYS, priorityFor } from "../src/lib/priority";
import { COUNTRIES, THEMES, THEME_SLUGS } from "../src/lib/reference";

const MODEL = process.env.PW_EXTRACTION_MODEL || "claude-opus-5-5";
const BATCH = 25;
const MAX_ATTEMPTS = 3;

const COUNTRY_CODES = COUNTRIES.map((c) => c.iso2) as [string, ...string[]];

export const AnalysisSchema = z.object({
  countries: z.array(z.enum(COUNTRY_CODES)).describe("ISO codes of Pacific Island Countries and Territories the item is substantially about"),
  themes: z.array(z.enum(THEME_SLUGS)).describe("One or more security themes; empty only if the item has no security relevance"),
  keywords: z.array(z.string()).describe("Up to 8 short keywords"),
  entities: z
    .array(z.object({ name: z.string(), type: z.enum(["person", "organisation", "government_body", "country", "vessel", "agreement", "location", "other"]) }))
    .describe("Named entities that matter for security analysis"),
  executive_summary: z.string().describe("One or two plain sentences: what happened"),
  analyst_summary: z.string().describe("Two to four sentences: why it matters for Pacific security, grounded only in the item text"),
  alert_category: z.enum(ALERT_CATEGORY_KEYS),
  is_commentary: z.boolean().describe("True for opinion, analysis or commentary rather than reporting of an event"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const SYSTEM = `You are an intelligence analyst at a Pacific regional security fusion centre. You read one open-source item at a time and record structured metadata about it.

Rules:
- Use only what the item says. Do not add facts from outside knowledge; if the text is too short to tell, say less.
- Countries: only Pacific Island Countries and Territories the item is substantially about, from this list: ${COUNTRIES.map((c) => `${c.iso2}=${c.name}`).join(", ")}. Australia, New Zealand, the US, China and others are not on the list; record them as entities instead.
- Themes: ${THEMES.map((t) => `${t.slug} (${t.name})`).join("; ")}. Transnational crime covers drugs, firearms trafficking, people smuggling, money laundering and organised crime.
- Alert category: pick the single best fit. ${ALERT_CATEGORY_KEYS.map((k) => `${k} = ${ALERT_CATEGORIES[k].label}`).join("; ")}. Opinion and analysis pieces are "commentary" unless they report a new event.
- Write summaries in plain, neutral British English.`;

interface PendingItem {
  id: number;
  title: string;
  description: string | null;
  published_at: Date | null;
  source_name: string;
  source_kind: string;
  base_credibility: number;
}

let client: Anthropic | null = null;

export async function analyseItem(item: PendingItem): Promise<Analysis> {
  client ??= new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(AnalysisSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Source: ${item.source_name}\nPublished: ${item.published_at?.toISOString() ?? "unknown"}\nHeadline: ${item.title}\n\n${item.description ?? "(no summary text in the feed)"}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error(`Model declined: ${response.stop_details?.category ?? "unknown"}`);
  if (!response.parsed_output) throw new Error(`No structured output (stop_reason ${response.stop_reason})`);
  return response.parsed_output;
}

/** Process items that have no analysis yet. Returns counts. */
export async function processPending(): Promise<{ processed: number; failed: number; skipped?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { processed: 0, failed: 0, skipped: "no ANTHROPIC_API_KEY" };

  const items = await sql<PendingItem[]>`
    select i.id, i.title, i.description, i.published_at, s.name as source_name, s.kind as source_kind, s.base_credibility
    from items i
    join sources s on s.id = i.source_id
    left join item_analysis a on a.item_id = i.id
    left join analysis_failures f on f.item_id = i.id
    where a.item_id is null and i.review_status <> 'discarded' and coalesce(f.attempts, 0) < ${MAX_ATTEMPTS}
    order by i.published_at desc nulls last
    limit ${BATCH}`;

  let processed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const a = await analyseItem(item);
      // Keep the model's countries, plus any the item names explicitly
      const countries = [...new Set([...a.countries, ...matchCountries(`${item.title} ${item.description ?? ""}`)])];
      const official = item.source_kind === "regional" || item.source_kind === "government";
      await sql`
        insert into item_analysis (item_id, countries, themes, keywords, entities, executive_summary, analyst_summary,
          alert_category, priority, is_commentary, confidence, verification_status, model)
        values (${item.id}, ${countries}, ${[...new Set(a.themes)]}, ${a.keywords.slice(0, 8)}, ${sql.json(a.entities)},
          ${a.executive_summary}, ${a.analyst_summary}, ${a.alert_category}, ${priorityFor(a.alert_category)},
          ${a.is_commentary}, ${item.base_credibility}, ${official ? "official" : "single_source"}, ${MODEL})
        on conflict (item_id) do nothing`;
      await sql`delete from analysis_failures where item_id = ${item.id}`;
      processed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await sql`
        insert into analysis_failures (item_id, last_error) values (${item.id}, ${message})
        on conflict (item_id) do update set attempts = analysis_failures.attempts + 1, last_error = excluded.last_error, last_at = now()`;
    }
  }
  return { processed, failed };
}
