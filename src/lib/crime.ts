import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { SourceRef } from "./analyst";
import { sql } from "./db";
import { COUNTRIES } from "./reference";

// Transnational crime assessments. Claude drafts one from the approved crime
// reporting for a scope and period; every finding names the reports it rests
// on. An analyst then keeps or drops each finding and publishes or rejects it.

export const CRIME_MODEL = process.env.PW_ANALYST_MODEL || "claude-opus-5-5";
export const MIN_REPORTS = 3;
export const MAX_REPORTS = 60;
export const PERIODS = [90, 180, 365] as const;

// UK Professional Head of Intelligence Assessment probability yardstick
export const LIKELIHOOD = {
  remote: "Remote",
  highly_unlikely: "Highly unlikely",
  unlikely: "Unlikely",
  realistic_possibility: "Realistic possibility",
  likely: "Likely",
  highly_likely: "Highly likely",
  almost_certain: "Almost certain",
} as const;
type Likelihood = keyof typeof LIKELIHOOD;
const LIKELIHOOD_KEYS = Object.keys(LIKELIHOOD) as [Likelihood, ...Likelihood[]];

export const COMMODITIES = {
  methamphetamine: "Methamphetamine",
  cocaine: "Cocaine",
  cannabis: "Cannabis",
  heroin: "Heroin",
  other_drugs: "Other drugs",
  firearms: "Firearms",
  ammunition: "Ammunition",
  people: "People (trafficking or smuggling)",
  wildlife: "Wildlife",
  timber: "Timber",
  fish: "Fish (IUU catch)",
  cash: "Cash",
  other: "Other",
} as const;
type Commodity = keyof typeof COMMODITIES;
const COMMODITY_KEYS = Object.keys(COMMODITIES) as [Commodity, ...Commodity[]];

const COUNTRY_CODES = COUNTRIES.map((c) => c.iso2) as [string, ...string[]];
const sources = z.array(z.number()).describe("Numbers of the reports this rests on, e.g. [2, 7]");

export const DraftSchema = z.object({
  bottom_line: z.string().describe("Two to four sentences: the overall assessment for this scope and period"),
  key_judgements: z.array(z.object({ statement: z.string(), likelihood: z.enum(LIKELIHOOD_KEYS), sources })),
  indicators: z
    .array(z.object({ title: z.string(), description: z.string(), likelihood: z.enum(LIKELIHOOD_KEYS), sources }))
    .describe("Most likely indicators: patterns, routes or methods the reporting suggests are active or emerging"),
  enforcement_gaps: z.array(
    z.object({ gap: z.string(), consequence: z.string(), countries: z.array(z.enum(COUNTRY_CODES)), sources }),
  ),
  seizures: z
    .array(
      z.object({
        commodity: z.enum(COMMODITY_KEYS),
        description: z.string().describe("What was seized or intercepted, by whom, where"),
        quantity: z.number().nullable().describe("Only when the report states a number"),
        unit: z.string().nullable().describe('e.g. "kg", "firearms", "people", "USD"; null when no quantity'),
        country: z.enum(COUNTRY_CODES).nullable(),
        date: z.string().nullable().describe("YYYY-MM-DD when the report gives the date of the seizure"),
        sources,
      }),
    )
    .describe("Each reported seizure or interception once, even if several reports cover it"),
  information_gaps: z.array(z.string()).describe("What the reporting does not tell us that an analyst would need"),
});

export type Draft = z.infer<typeof DraftSchema>;
export type Section = "key_judgements" | "indicators" | "enforcement_gaps" | "seizures";
export const SECTIONS: Section[] = ["key_judgements", "indicators", "enforcement_gaps", "seizures"];

/** Keep only citations that point at a real report, and drop findings left with none. */
export function cleanDraft(d: Draft, reportCount: number): Draft {
  const valid = (s: number[]) => [...new Set(s.filter((n) => Number.isInteger(n) && n >= 1 && n <= reportCount))].sort((a, b) => a - b);
  const keep = <T extends { sources: number[] }>(rows: T[]) => rows.map((r) => ({ ...r, sources: valid(r.sources) })).filter((r) => r.sources.length > 0);
  return {
    bottom_line: d.bottom_line.trim(),
    key_judgements: keep(d.key_judgements),
    indicators: keep(d.indicators),
    enforcement_gaps: keep(d.enforcement_gaps),
    seizures: keep(d.seizures).map((s) => ({ ...s, date: s.date && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : null })),
    information_gaps: d.information_gaps.map((g) => g.trim()).filter(Boolean),
  };
}

/** Apply an analyst's review: only findings whose key ("section:index") was ticked survive. */
export function applyReview(d: Draft, kept: Set<string>, bottomLine: string): Draft {
  const pick = <T>(section: Section, rows: T[]) => rows.filter((_, i) => kept.has(`${section}:${i}`));
  return {
    ...d,
    bottom_line: bottomLine.trim() || d.bottom_line,
    key_judgements: pick("key_judgements", d.key_judgements),
    indicators: pick("indicators", d.indicators),
    enforcement_gaps: pick("enforcement_gaps", d.enforcement_gaps),
    seizures: pick("seizures", d.seizures),
  };
}

export interface SeizureTotal {
  commodity: Commodity;
  unit: string | null;
  quantity: number | null;
  count: number;
}

/** Seizures grouped by commodity and unit; quantities summed where reports gave one. */
export function seizureTotals(seizures: Draft["seizures"]): SeizureTotal[] {
  const map = new Map<string, SeizureTotal>();
  for (const s of seizures) {
    const unit = s.quantity != null ? (s.unit?.trim().toLowerCase() || null) : null;
    const key = `${s.commodity}|${unit ?? ""}`;
    const t = map.get(key) ?? { commodity: s.commodity, unit, quantity: null, count: 0 };
    t.count++;
    if (s.quantity != null) t.quantity = (t.quantity ?? 0) + s.quantity;
    map.set(key, t);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.commodity.localeCompare(b.commodity));
}

interface CrimeRow {
  id: number;
  title: string;
  url: string;
  description: string | null;
  at: Date;
  source_name: string;
  countries: string[];
  confidence: number;
  verification_status: string;
  location_name: string | null;
  executive_summary: string;
  analyst_summary: string;
}

/** Approved transnational-crime reporting for a scope and period, newest first. */
export async function crimeReports(country: string | null, from: Date, to: Date): Promise<CrimeRow[]> {
  return sql<CrimeRow[]>`
    select i.id, i.title, i.url, i.description, coalesce(i.published_at, i.fetched_at) as at, s.name as source_name,
      a.countries::text[] as countries, a.confidence, a.verification_status, a.location_name, a.executive_summary, a.analyst_summary
    from items i join sources s on s.id = i.source_id join item_analysis a on a.item_id = i.id
    where i.review_status = 'approved'
      and ('transnational-crime' = any(a.themes) or a.alert_category = 'transnational_crime_incident')
      and coalesce(i.published_at, i.fetched_at) between ${from} and ${to}
      ${country ? sql`and ${country}::char(2) = any(a.countries)` : sql``}
    order by coalesce(i.published_at, i.fetched_at) desc
    limit ${MAX_REPORTS}`;
}

/** Approved crime reports per country in the period: counted from the data, not by the model. */
export async function incidentCounts(country: string | null, from: Date, to: Date) {
  return sql<{ iso2: string; name: string; reports: number }[]>`
    select c.iso2::text, c.name, count(*)::int as reports
    from items i join item_analysis a on a.item_id = i.id join countries c on c.iso2 = any(a.countries)
    where i.review_status = 'approved'
      and ('transnational-crime' = any(a.themes) or a.alert_category = 'transnational_crime_incident')
      and coalesce(i.published_at, i.fetched_at) between ${from} and ${to}
      ${country ? sql`and c.iso2 = ${country}` : sql``}
    group by c.iso2, c.name
    order by reports desc, c.name`;
}

const SYSTEM = `You are a senior transnational crime analyst at Pacific Watchmen, a Pacific regional security intelligence fusion centre. You draft crime assessments for analysts to review. Your draft is never published until an analyst has checked it.

You are given numbered open-source reports that analysts have already approved. Work only from them.
- Every judgement, indicator, enforcement gap and seizure must list the numbers of the reports it rests on. Do not use outside knowledge, even when you are confident.
- Express likelihood with the probability yardstick (remote, highly unlikely, unlikely, realistic possibility, likely, highly likely, almost certain). Base it on the strength and corroboration of the reporting, and be cautious when a point rests on one report or low credibility.
- Record each seizure or interception once, even when several reports describe it. Give a quantity only when a report states one.
- Enforcement gaps are weaknesses the reporting shows or describes (capacity, legal, coordination, surveillance), not general advice.
- Prefer fewer, well-supported findings over many thin ones. It is fine for a section to be empty.
- Write in plain, neutral British English for a government reader.`;

function reportText(r: CrimeRow, n: number) {
  const names = r.countries.map((c) => COUNTRIES.find((x) => x.iso2 === c)?.name ?? c).join(", ");
  return [
    `[${n}] ${r.title}`,
    `Published ${r.at.toISOString().slice(0, 10)} by ${r.source_name}; credibility ${r.confidence}/100 (${r.verification_status.replace("_", " ")})`,
    `Countries: ${names || "none tagged"}${r.location_name ? `; location: ${r.location_name}` : ""}`,
    `Summary: ${r.executive_summary}`,
    `Significance: ${r.analyst_summary}`,
    r.description ? `Source text: ${r.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

let client: Anthropic | null = null;

export type DraftResult =
  | { status: "drafted"; draft: Draft; sources: SourceRef[]; model: string }
  | { status: "too_few"; reports: number }
  | { status: "declined" };

export async function draftAssessment(country: string | null, from: Date, to: Date): Promise<DraftResult> {
  const rows = await crimeReports(country, from, to);
  if (rows.length < MIN_REPORTS) return { status: "too_few", reports: rows.length };
  const scope = country ? COUNTRIES.find((c) => c.iso2 === country)!.name : "the Pacific Island Countries and Territories as a whole";

  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: CRIME_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(DraftSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Draft a transnational crime assessment for ${scope}, covering ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}.\n\nReports:\n\n${rows.map((r, i) => reportText(r, i + 1)).join("\n\n")}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") return { status: "declined" };
  if (!response.parsed_output) throw new Error(`No structured output (stop_reason ${response.stop_reason})`);

  return {
    status: "drafted",
    draft: cleanDraft(response.parsed_output, rows.length),
    sources: rows.map((r, i) => ({
      n: i + 1, id: r.id, title: r.title, url: r.url, source: r.source_name, at: r.at.toISOString(), confidence: r.confidence,
    })),
    model: response.model,
  };
}
