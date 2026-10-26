import { notFound } from "next/navigation";
import type { SourceRef } from "@/lib/analyst";
import { COMMODITIES, incidentCounts, LIKELIHOOD, seizureTotals, type Draft, type Section } from "@/lib/crime";
import { sql } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { COUNTRY_BY_ISO } from "@/lib/reference";
import { reviewAssessment } from "../actions";

interface Assessment {
  id: number;
  country_iso: string | null;
  period_start: Date;
  period_end: Date;
  status: "draft" | "published" | "rejected";
  content: Draft;
  sources: SourceRef[];
  model: string;
  drafted_at: Date;
  drafted_by_name: string;
  reviewed_at: Date | null;
  reviewed_by_name: string | null;
  review_note: string | null;
}

const LIKELIHOOD_TONE: Record<string, string> = {
  remote: "text-faint", highly_unlikely: "text-faint", unlikely: "text-muted", realistic_possibility: "text-low",
  likely: "text-medium", highly_likely: "text-high", almost_certain: "text-high",
};

function Cites({ n }: { n: number[] }) {
  return (
    <span className="ml-1 font-mono text-[10px]">
      {n.map((x) => <a key={x} href={`#src-${x}`} className="mr-0.5 text-accent hover:underline">[{x}]</a>)}
    </span>
  );
}

function Likelihood({ value }: { value: string }) {
  return <span className={`font-mono text-[10px] uppercase tracking-widest ${LIKELIHOOD_TONE[value] ?? ""}`}>{LIKELIHOOD[value as keyof typeof LIKELIHOOD] ?? value}</span>;
}

function Keep({ editable, section, i }: { editable: boolean; section: Section; i: number }) {
  if (!editable) return null;
  return (
    <label className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
      <input type="checkbox" name="keep" value={`${section}:${i}`} defaultChecked className="accent-sky-500" /> Keep
    </label>
  );
}

const countryNames = (codes: (string | null)[]) => codes.filter(Boolean).map((c) => COUNTRY_BY_ISO.get(c!)?.name ?? c).join(", ");

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [a] = await sql<Assessment[]>`
    select a.*, d.full_name as drafted_by_name, r.full_name as reviewed_by_name
    from crime_assessments a join users d on d.id = a.drafted_by left join users r on r.id = a.reviewed_by
    where a.id = ${id}`;
  if (!a) notFound();
  const editable = a.status === "draft";
  const c = a.content;
  const totals = seizureTotals(c.seizures);
  const incidents = await incidentCounts(a.country_iso, a.period_start, a.period_end);
  const scope = a.country_iso ? COUNTRY_BY_ISO.get(a.country_iso)?.name : "Regional (all PICTs)";

  const body = (
    <div className="space-y-6">
      <div className="panel p-6">
        <p className="eyebrow">Bottom line</p>
        {editable ? (
          <textarea name="bottom_line" defaultValue={c.bottom_line} rows={4} maxLength={4000} className="input mt-3 text-[15px] leading-relaxed" />
        ) : (
          <p className="mt-3 text-[15px] leading-relaxed">{c.bottom_line}</p>
        )}
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Key judgements</p>
        {c.key_judgements.length ? (
          <ol className="mt-3 space-y-3">
            {c.key_judgements.map((k, i) => (
              <li key={i} className="flex items-start justify-between gap-4 border-b border-line/60 pb-3 last:border-0">
                <div>
                  <Likelihood value={k.likelihood} />
                  <p className="mt-1 text-sm leading-relaxed">{k.statement}<Cites n={k.sources} /></p>
                </div>
                <Keep editable={editable} section="key_judgements" i={i} />
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-muted">None.</p>}
      </div>

      <div>
        <p className="eyebrow">Most likely indicators</p>
        {c.indicators.length ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {c.indicators.map((ind, i) => (
              <div key={i} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <Likelihood value={ind.likelihood} />
                  <Keep editable={editable} section="indicators" i={i} />
                </div>
                <p className="mt-2 font-semibold">{ind.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/85">{ind.description}<Cites n={ind.sources} /></p>
              </div>
            ))}
          </div>
        ) : <p className="panel mt-3 p-5 text-sm text-muted">None.</p>}
      </div>

      <div className="panel overflow-x-auto p-6">
        <p className="eyebrow">Enforcement gaps</p>
        {c.enforcement_gaps.length ? (
          <table className="mt-3 w-full min-w-[640px] text-sm">
            <thead className="text-left font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr><th className="py-2 pr-4">Gap</th><th className="pr-4">Consequence</th><th className="pr-4">Countries</th>{editable ? <th /> : null}</tr>
            </thead>
            <tbody>
              {c.enforcement_gaps.map((g, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="py-2 pr-4">{g.gap}<Cites n={g.sources} /></td>
                  <td className="py-2 pr-4 text-ink/85">{g.consequence}</td>
                  <td className="py-2 pr-4 text-muted">{countryNames(g.countries) || "Not specified"}</td>
                  {editable ? <td className="py-2"><Keep editable section="enforcement_gaps" i={i} /></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mt-3 text-sm text-muted">None.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="panel overflow-x-auto p-6">
          <p className="eyebrow">Reported seizures and interceptions</p>
          {c.seizures.length ? (
            <table className="mt-3 w-full min-w-[560px] text-sm">
              <thead className="text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr><th className="py-2 pr-4">Commodity</th><th className="pr-4">Details</th><th className="pr-4">Quantity</th><th className="pr-4">Where / when</th>{editable ? <th /> : null}</tr>
              </thead>
              <tbody>
                {c.seizures.map((s, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-2 pr-4">{COMMODITIES[s.commodity]}</td>
                    <td className="py-2 pr-4 text-ink/85">{s.description}<Cites n={s.sources} /></td>
                    <td className="py-2 pr-4 font-mono">{s.quantity != null ? `${s.quantity.toLocaleString("en-GB")} ${s.unit ?? ""}` : "Not stated"}</td>
                    <td className="py-2 pr-4 text-muted">{countryNames([s.country]) || "—"}{s.date ? ` · ${formatDate(s.date)}` : ""}</td>
                    {editable ? <td className="py-2"><Keep editable section="seizures" i={i} /></td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="mt-3 text-sm text-muted">No seizures reported in this period.</p>}
        </div>
        <div className="space-y-6">
          <div className="panel p-5">
            <p className="eyebrow">Seizure totals</p>
            {totals.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {totals.map((t) => (
                  <li key={`${t.commodity}-${t.unit}`} className="flex justify-between gap-3">
                    <span>{COMMODITIES[t.commodity]}</span>
                    <span className="text-right font-mono">{t.quantity != null ? `${t.quantity.toLocaleString("en-GB")} ${t.unit ?? ""}` : "—"}<span className="block text-[10px] text-faint">{t.count} seizure{t.count === 1 ? "" : "s"}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-muted">None.</p>}
            {editable ? <p className="mt-3 font-mono text-[10px] text-faint">Totals update to the kept seizures when published.</p> : null}
          </div>
          <div className="panel p-5">
            <p className="eyebrow">Approved crime reports by country</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {incidents.map((r) => <li key={r.iso2} className="flex justify-between"><span>{r.name}</span><span className="font-mono">{r.reports}</span></li>)}
            </ul>
            <p className="mt-3 font-mono text-[10px] text-faint">Counted from the library for this period, not by the model.</p>
          </div>
        </div>
      </div>

      {c.information_gaps.length ? (
        <div className="panel p-6">
          <p className="eyebrow">Information gaps</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink/85">{c.information_gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      ) : null}

      <div className="panel p-6">
        <p className="eyebrow">Sources</p>
        <ol className="mt-3 space-y-2 text-sm">
          {a.sources.map((s) => (
            <li key={s.n} id={`src-${s.n}`}>
              <span className="mr-1 font-mono text-xs text-accent">[{s.n}]</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{s.title}</a>
              <span className="ml-2 text-xs text-faint">{s.source} · {formatDate(s.at)} · credibility {s.confidence}/100</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Transnational crime assessment</p>
          <h1 className="mt-1 text-2xl font-bold">{scope}</h1>
          <p className="mt-1 text-sm text-muted">{formatDate(a.period_start)} to {formatDate(a.period_end)} · {a.sources.length} approved reports</p>
        </div>
        <span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${a.status === "published" ? "border-good/40 text-good" : a.status === "draft" ? "border-medium/40 text-medium" : "border-high/40 text-high"}`}>
          {a.status === "draft" ? "Draft · awaiting review" : a.status}
        </span>
      </div>

      <p className="text-xs text-faint">
        AI draft by {a.model}, requested by {a.drafted_by_name} {formatDateTime(a.drafted_at)}.
        {a.reviewed_by_name ? ` Reviewed by ${a.reviewed_by_name} ${formatDateTime(a.reviewed_at)}.` : ""}
        {a.review_note ? ` Note: ${a.review_note}` : ""}
      </p>

      {editable ? (
        <form action={reviewAssessment.bind(null, "publish")} className="space-y-6">
          <input type="hidden" name="id" value={a.id} />
          <p className="panel border-medium/40 px-4 py-3 text-sm text-medium">
            Check every finding against its cited reports. Untick anything unsupported or wrong, edit the bottom line if needed, then publish or reject.
          </p>
          {body}
          <div className="panel flex flex-wrap items-end gap-3 p-5">
            <label className="min-w-64 flex-1 space-y-1 text-sm">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">Review note (optional)</span>
              <input name="note" maxLength={1000} className="input" />
            </label>
            <button formAction={reviewAssessment.bind(null, "reject")} className="btn">Reject draft</button>
            <button className="btn btn-primary">Publish reviewed assessment</button>
          </div>
        </form>
      ) : body}
    </div>
  );
}
