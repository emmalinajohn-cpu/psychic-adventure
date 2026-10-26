import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { MIN_REPORTS, PERIODS } from "@/lib/crime";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { COUNTRIES } from "@/lib/reference";
import { createDraft } from "./actions";

export const metadata = { title: "Crime Analysis" };

interface ListRow {
  id: number;
  country: string | null;
  period_start: Date;
  period_end: Date;
  status: "draft" | "published" | "rejected";
  drafted_at: Date;
  drafted_by_name: string;
  reviewed_at: Date | null;
  reviewed_by_name: string | null;
  bottom_line: string;
}

const ERRORS: Record<string, string> = {
  request: "Please choose a scope and period.",
  not_configured: "Drafting is not configured on this server yet: an administrator needs to set ANTHROPIC_API_KEY.",
  rate: "You have reached the limit of 10 drafts an hour. Please try again later.",
  declined: "The model declined to draft this assessment. Try a different scope or period.",
  api: "The Claude API returned an error. Please try again in a few minutes.",
  failed: "The draft could not be produced because of a technical error. Please try again.",
};

function Row({ a }: { a: ListRow }) {
  return (
    <li className="py-3">
      <Link href={`/dashboard/crime/${a.id}`} className="font-medium hover:text-accent">
        {a.country ?? "Regional (all PICTs)"} · {formatDate(a.period_start)} to {formatDate(a.period_end)}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{a.bottom_line}</p>
      <p className="mt-1 font-mono text-[10px] text-faint">
        Drafted by {a.drafted_by_name} {formatDate(a.drafted_at)}
        {a.reviewed_by_name ? ` · ${a.status === "published" ? "published" : "rejected"} by ${a.reviewed_by_name} ${formatDate(a.reviewed_at)}` : ""}
      </p>
    </li>
  );
}

export default async function CrimePage({ searchParams }: { searchParams: Promise<{ error?: string; n?: string }> }) {
  const p = await searchParams;
  const rows = await sql<ListRow[]>`
    select a.id, c.name as country, a.period_start, a.period_end, a.status, a.drafted_at, d.full_name as drafted_by_name,
      a.reviewed_at, r.full_name as reviewed_by_name, a.content->>'bottom_line' as bottom_line
    from crime_assessments a
    left join countries c on c.iso2 = a.country_iso
    join users d on d.id = a.drafted_by
    left join users r on r.id = a.reviewed_by
    order by a.drafted_at desc
    limit 100`;
  const drafts = rows.filter((r) => r.status === "draft");
  const published = rows.filter((r) => r.status === "published");
  const rejected = rows.filter((r) => r.status === "rejected");
  const error = p.error === "too_few"
    ? `Only ${Number(p.n) || 0} approved transnational crime report${Number(p.n) === 1 ? "" : "s"} in that scope and period. At least ${MIN_REPORTS} are needed for a draft; try a longer period or the regional scope.`
    : p.error ? ERRORS[p.error] : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Transnational crime</p>
        <h1 className="mt-1 text-2xl font-bold">Crime analysis</h1>
        <p className="mt-1 text-sm text-muted">
          Assessments drafted by AI from approved transnational crime reporting. Every finding cites its reports, and nothing is published until an analyst has reviewed it.
        </p>
      </div>

      <form action={createDraft} className="panel flex flex-wrap items-end gap-3 p-5 text-sm">
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Scope</span>
          <select name="country" defaultValue="" className="input">
            <option value="">Regional (all PICTs)</option>
            {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Period</span>
          <select name="days" defaultValue="180" className="input">
            {PERIODS.map((d) => <option key={d} value={d}>{d === 365 ? "Last year" : `Last ${d} days`}</option>)}
          </select>
        </label>
        <SubmitButton pending="Drafting… this can take a minute">Draft new assessment</SubmitButton>
      </form>

      {error ? <p className="panel border-medium/40 px-4 py-3 text-sm text-medium">{error}</p> : null}

      <div className="panel p-5">
        <p className="eyebrow">Awaiting analyst review · {drafts.length}</p>
        {drafts.length ? <ul className="mt-2 divide-y divide-line">{drafts.map((a) => <Row key={a.id} a={a} />)}</ul> : <p className="mt-2 text-sm text-muted">No drafts waiting.</p>}
      </div>

      <div className="panel p-5">
        <p className="eyebrow">Published assessments · {published.length}</p>
        {published.length ? <ul className="mt-2 divide-y divide-line">{published.map((a) => <Row key={a.id} a={a} />)}</ul> : <p className="mt-2 text-sm text-muted">No assessment has been published yet.</p>}
      </div>

      {rejected.length ? (
        <details className="panel p-5">
          <summary className="eyebrow cursor-pointer">Rejected drafts · {rejected.length}</summary>
          <ul className="mt-2 divide-y divide-line">{rejected.map((a) => <Row key={a.id} a={a} />)}</ul>
        </details>
      ) : null}
    </div>
  );
}
