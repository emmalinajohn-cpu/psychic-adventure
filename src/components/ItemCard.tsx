import { formatDateTime } from "@/lib/format";
import type { ItemRow } from "@/lib/queries";
import { CountryList, Credibility, PriorityBadge, ThemeChips } from "./Badges";

export function ItemCard({ item, showAnalyst = false }: { item: ItemRow; showAnalyst?: boolean }) {
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <PriorityBadge priority={item.priority} />
        <span className="font-medium text-ink/80">{item.source_name}</span>
        <span>·</span>
        <time dateTime={(item.published_at ?? item.fetched_at).toISOString()}>{formatDateTime(item.published_at ?? item.fetched_at)}</time>
        <span>·</span>
        <CountryList countries={item.countries} />
        {item.event_source_count && item.event_source_count > 1 ? (
          <span className="text-good">· reported by {item.event_source_count} sources</span>
        ) : null}
      </div>
      <h3 className="mt-2 text-[15px] font-semibold leading-snug">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
          {item.title}
        </a>
      </h3>
      {item.executive_summary ? <p className="mt-2 text-sm leading-relaxed text-ink/85">{item.executive_summary}</p> : null}
      {showAnalyst && item.analyst_summary ? (
        <p className="mt-2 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-muted">{item.analyst_summary}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ThemeChips themes={item.themes} />
        <Credibility confidence={item.confidence} status={item.verification_status} />
      </div>
      {item.executive_summary ? <p className="mt-2 font-mono text-[10px] text-faint">Summary machine-generated from the source text and reviewed by an analyst.</p> : null}
    </article>
  );
}
