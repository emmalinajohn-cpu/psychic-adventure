import Anthropic from "@anthropic-ai/sdk";
import { sql } from "./db";
import { COUNTRIES, THEMES } from "./reference";

// The AI Analyst answers questions from analyst-approved reports only. Retrieval
// is Postgres full-text search; the matching reports go to Claude as search
// results with citations on, so every claim in the answer points at a report.

export const ANALYST_MODEL = process.env.PW_ANALYST_MODEL || "claude-opus-5-5";
export const MAX_SOURCES = 20;

export interface AnalystFilters {
  country?: string;
  theme?: string;
  days?: number; // undefined = all time
}

export interface SourceRef {
  n: number; // 1-based number shown in the answer
  id: number;
  title: string;
  url: string;
  source: string;
  at: string;
  confidence: number;
}

export interface Segment {
  text: string;
  sources: number[];
}

interface RetrievedRow {
  id: number;
  title: string;
  url: string;
  description: string | null;
  at: Date;
  source_name: string;
  countries: string[];
  themes: string[];
  priority: string;
  confidence: number;
  verification_status: string;
  executive_summary: string;
  analyst_summary: string;
}

/** Approved reports in scope, those matching the question's words first, then the most recent. */
export async function retrieve(question: string, f: AnalystFilters): Promise<RetrievedRow[]> {
  return sql<RetrievedRow[]>`
    with q as (
      select nullif(replace(plainto_tsquery('english', ${question})::text, ' & ', ' | '), '')::tsquery as t
    )
    select i.id, i.title, i.url, i.description, coalesce(i.published_at, i.fetched_at) as at, s.name as source_name,
      a.countries::text[] as countries, a.themes, a.priority, a.confidence, a.verification_status,
      a.executive_summary, a.analyst_summary
    from items i
    join sources s on s.id = i.source_id
    join item_analysis a on a.item_id = i.id
    cross join q
    where i.review_status = 'approved'
      ${f.country ? sql`and ${f.country}::char(2) = any(a.countries)` : sql``}
      ${f.theme ? sql`and ${f.theme} = any(a.themes)` : sql``}
      ${f.days ? sql`and coalesce(i.published_at, i.fetched_at) >= now() - make_interval(days => ${f.days}::int)` : sql``}
    order by
      coalesce(ts_rank(i.search || to_tsvector('english', a.executive_summary || ' ' || a.analyst_summary), q.t), 0) desc,
      coalesce(i.published_at, i.fetched_at) desc
    limit ${MAX_SOURCES}`;
}

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.iso2, c.name]));
const THEME_NAME = new Map(THEMES.map((t) => [t.slug, t.name]));

export function toSearchResult(r: RetrievedRow): Anthropic.Beta.BetaSearchResultBlockParam {
  const lines = [
    `Headline: ${r.title}`,
    `Published: ${r.at.toISOString().slice(0, 10)} by ${r.source_name}`,
    `Credibility: ${r.confidence}/100 (${r.verification_status.replace("_", " ")}); priority ${r.priority}`,
    `Countries: ${r.countries.map((c) => COUNTRY_NAME.get(c) ?? c).join(", ") || "none tagged"}`,
    `Themes: ${r.themes.map((t) => THEME_NAME.get(t) ?? t).join(", ") || "none tagged"}`,
    `Summary: ${r.executive_summary}`,
    `Significance: ${r.analyst_summary}`,
  ];
  if (r.description) lines.push(`Source text: ${r.description}`);
  return {
    type: "search_result",
    source: r.url,
    title: r.title,
    content: [{ type: "text", text: lines.join("\n") }],
    citations: { enabled: true },
  };
}

const SYSTEM = `You are the AI Analyst of Pacific Watchmen, a Pacific regional security intelligence fusion centre. Analysts ask you questions about security developments across the 22 Pacific Island Countries and Territories.

You are given search results: open-source reports that analysts have already reviewed and approved. Answer only from them.
- Support every factual claim with a citation to the report it comes from. Do not use outside knowledge, even when you are confident.
- When the reports do not answer the question, or only answer part of it, say so plainly and say what is missing. A short honest answer is better than a padded one.
- When reports disagree, or a claim rests on a single low-credibility source, point that out.
- Distinguish what the reports state from your own assessment, and label assessments as such.
- Write in plain, neutral British English for a government reader. Use short paragraphs; use a list only for several parallel items.`;

export function parseAnswer(content: Anthropic.Beta.BetaContentBlock[]): Segment[] {
  const out: Segment[] = [];
  for (const block of content) {
    if (block.type !== "text") continue;
    const sources = [
      ...new Set((block.citations ?? []).flatMap((c) => (c.type === "search_result_location" ? [c.search_result_index + 1] : []))),
    ].sort((a, b) => a - b);
    const prev = out.at(-1);
    // Uncited fragments (spacing, joining words) attach to the previous segment
    if (prev && sources.length === 0 && prev.sources.length === 0) prev.text += block.text;
    else out.push({ text: block.text, sources });
  }
  return out;
}

export type AnalystResult =
  | { status: "answered"; answer: Segment[]; sources: SourceRef[]; model: string; inputTokens: number; outputTokens: number }
  | { status: "no_sources" | "declined"; answer: Segment[]; sources: SourceRef[]; model?: string };

let client: Anthropic | null = null;

export async function ask(question: string, f: AnalystFilters, now = new Date()): Promise<AnalystResult> {
  const rows = await retrieve(question, f);
  const sources: SourceRef[] = rows.map((r, i) => ({
    n: i + 1, id: r.id, title: r.title, url: r.url, source: r.source_name, at: r.at.toISOString(), confidence: r.confidence,
  }));
  if (!rows.length) return { status: "no_sources", answer: [], sources };

  client ??= new Anthropic();
  const response = await client.beta.messages.create({
    model: ANALYST_MODEL,
    max_tokens: 16000,
    // On a safety decline the API re-runs the request on a suitable fallback model
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...rows.map(toSearchResult),
          { type: "text", text: `Today is ${now.toISOString().slice(0, 10)}.\n\nQuestion: ${question}` },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return { status: "declined", answer: [], sources, model: response.model };
  return {
    status: "answered",
    answer: parseAnswer(response.content),
    sources,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
