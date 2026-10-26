import { SubmitButton } from "@/components/SubmitButton";
import type { Segment, SourceRef } from "@/lib/analyst";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { COUNTRIES, COUNTRY_BY_ISO, THEMES, THEME_BY_SLUG } from "@/lib/reference";
import { askAnalyst } from "./actions";

export const metadata = { title: "AI Analyst" };

interface QueryRow {
  id: number;
  question: string;
  filters: { country?: string; theme?: string; days?: number };
  status: "answered" | "no_sources" | "declined" | "error";
  answer: Segment[];
  sources: SourceRef[];
  model: string | null;
  created_at: Date;
}

const ERRORS: Record<string, string> = {
  question: "Please write a question of at least five characters.",
  not_configured: "The AI Analyst is not configured on this server yet: an administrator needs to set ANTHROPIC_API_KEY.",
  rate: "You have reached the limit of 30 questions an hour. Please try again later.",
};

function scopeLabel(f: QueryRow["filters"]) {
  const parts = [
    f.country ? COUNTRY_BY_ISO.get(f.country)?.name : "All PICTs",
    f.theme ? THEME_BY_SLUG.get(f.theme)?.name : null,
    f.days ? `last ${f.days === 365 ? "year" : `${f.days} days`}` : "all time",
  ];
  return parts.filter(Boolean).join(" · ");
}

export default async function AnalystPage({ searchParams }: { searchParams: Promise<{ id?: string; error?: string }> }) {
  const user = (await currentUser())!;
  const p = await searchParams;
  const id = Number(p.id);
  const [current] = Number.isInteger(id) && id > 0
    ? await sql<QueryRow[]>`select * from analyst_queries where id = ${id} and (user_id = ${user.id} or ${user.role === "admin"})`
    : [];
  const history = await sql<Pick<QueryRow, "id" | "question" | "status" | "created_at">[]>`
    select id, question, status, created_at from analyst_queries where user_id = ${user.id} order by created_at desc limit 15`;
  const cited = new Set(current?.answer.flatMap((s) => s.sources));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">AI Analyst</p>
        <h1 className="mt-1 text-2xl font-bold">Ask the intelligence library</h1>
        <p className="mt-1 text-sm text-muted">
          Answers are drawn only from analyst-approved reports, and every claim links to the report it comes from. Treat answers as a starting point for analysis, not a finished product.
        </p>
      </div>

      <form action={askAnalyst} className="panel space-y-3 p-5">
        <textarea
          name="question"
          required
          minLength={5}
          maxLength={1000}
          rows={3}
          className="input"
          placeholder="e.g. What illegal fishing activity has been reported around Kiribati, and who responded?"
          defaultValue={current?.question}
        />
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Country</span>
            <select name="country" defaultValue={current?.filters.country ?? ""} className="input">
              <option value="">All PICTs</option>
              {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Theme</span>
            <select name="theme" defaultValue={current?.filters.theme ?? ""} className="input">
              <option value="">All themes</option>
              {THEMES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Period</span>
            <select name="days" defaultValue={String(current?.filters.days ?? 90)} className="input">
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="">All time</option>
            </select>
          </label>
          <SubmitButton pending="Analysing reports…">Ask</SubmitButton>
        </div>
      </form>

      {p.error && ERRORS[p.error] ? <p className="panel border-medium/40 px-4 py-3 text-sm text-medium">{ERRORS[p.error]}</p> : null}

      {current ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <article className="panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{scopeLabel(current.filters)} · {formatDateTime(current.created_at)}</p>
            <h2 className="mt-2 text-lg font-semibold">{current.question}</h2>
            <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90">
              {current.status === "answered" ? (
                current.answer.map((s, i) => (
                  <span key={i}>
                    {s.text}
                    {s.sources.map((n) => (
                      <a key={n} href={`#src-${n}`} className="ml-0.5 align-super font-mono text-[10px] text-accent hover:underline">[{n}]</a>
                    ))}
                  </span>
                ))
              ) : current.status === "no_sources" ? (
                <span className="text-muted">There are no approved reports in this scope yet, so there is nothing to answer from. Try a wider period or fewer filters.</span>
              ) : current.status === "declined" ? (
                <span className="text-muted">The model declined to answer this question. Try rephrasing it.</span>
              ) : (
                <span className="text-muted">The question could not be answered because of a technical error. Please try again.</span>
              )}
            </div>
            {current.status === "answered" ? (
              <p className="mt-6 font-mono text-[10px] text-faint">Generated by {current.model} from {current.sources.length} approved reports; {cited.size} cited. Check the cited reports before relying on any claim.</p>
            ) : null}
          </article>

          <aside className="panel p-5">
            <p className="eyebrow">Sources</p>
            <ol className="mt-3 space-y-3 text-sm">
              {current.sources.map((s) => (
                <li key={s.n} id={`src-${s.n}`} className={cited.has(s.n) ? "" : "opacity-50"}>
                  <span className="mr-1 font-mono text-xs text-accent">[{s.n}]</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{s.title}</a>
                  <span className="block text-xs text-faint">{s.source} · {formatDate(s.at)} · credibility {s.confidence}/100{cited.has(s.n) ? "" : " · not cited"}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      ) : null}

      {history.length ? (
        <div className="panel p-5">
          <p className="eyebrow">Your recent questions</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-baseline justify-between gap-4 py-2">
                <a href={`/dashboard/analyst?id=${h.id}`} className="hover:text-accent">{h.question}</a>
                <span className="shrink-0 font-mono text-[10px] text-faint">{formatDateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
