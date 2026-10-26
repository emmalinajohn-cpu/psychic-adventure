import { CountryList, Credibility, PriorityBadge, ThemeChips } from "@/components/Badges";
import { formatDateTime } from "@/lib/format";
import { reviewQueue } from "@/lib/queries";
import { THEMES } from "@/lib/reference";
import { decide, editAnalysis } from "./actions";

export const metadata = { title: "Review Queue" };

export default async function ReviewPage() {
  const queue = await reviewQueue();
  return (
    <div>
      <p className="eyebrow">Analyst review</p>
      <h1 className="mt-1 text-2xl font-bold">Review queue</h1>
      <p className="mt-1 text-sm text-muted">
        {queue.length} item{queue.length === 1 ? "" : "s"} waiting. Nothing appears on dashboards until approved here. High priority first.
      </p>
      <div className="mt-6 space-y-3">
        {queue.length === 0 ? <p className="panel px-5 py-8 text-center text-sm text-muted">The queue is empty.</p> : null}
        {queue.map((i) => (
          <article key={i.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <PriorityBadge priority={i.priority} />
                  <span className="text-ink/80">{i.source_name}</span>
                  <span>{formatDateTime(i.published_at ?? i.fetched_at)}</span>
                  <CountryList countries={i.countries} />
                </div>
                <h2 className="mt-2 font-semibold">
                  <a href={i.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{i.title}</a>
                </h2>
                {i.executive_summary ? <p className="mt-1 text-sm text-ink/85">{i.executive_summary}</p> : null}
                {i.analyst_summary ? <p className="mt-1 border-l-2 border-accent/40 pl-3 text-sm text-muted">{i.analyst_summary}</p> : null}
                {!i.priority ? (
                  <p className="mt-2 text-xs text-medium">{i.failure ? `Processing failed: ${i.failure}` : "Not processed yet."}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <ThemeChips themes={i.themes} />
                  <Credibility confidence={i.confidence} status={i.verification_status} />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {(["approve", "approve_public", "discard"] as const).map((d) => (
                  <form key={d} action={decide}>
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="decision" value={d} />
                    <button className={`btn ${d === "discard" ? "btn-bad" : "btn-good"}`}>
                      {d === "approve" ? "✓ Approve" : d === "approve_public" ? "✓ Approve + public" : "✕ Discard"}
                    </button>
                  </form>
                ))}
              </div>
            </div>
            {i.priority ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-accent">Edit before approving</summary>
                <form action={editAnalysis} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={i.id} />
                  <textarea name="executive_summary" className="input min-h-20 text-sm" defaultValue={i.executive_summary ?? ""} />
                  <div className="flex flex-wrap gap-3 text-sm">
                    {THEMES.map((t) => (
                      <label key={t.slug} className="flex items-center gap-1.5">
                        <input type="checkbox" name="themes" value={t.slug} defaultChecked={i.themes?.includes(t.slug)} /> {t.name}
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <select name="priority" defaultValue={i.priority} className="input w-auto text-sm">
                      <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                    <button className="btn">Save changes</button>
                  </div>
                </form>
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
