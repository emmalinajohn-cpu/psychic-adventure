import { COUNTRY_BY_ISO, THEME_BY_SLUG } from "@/lib/reference";
import type { Priority } from "@/lib/priority";

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "border-high/40 bg-high/10 text-high",
  medium: "border-medium/40 bg-medium/10 text-medium",
  low: "border-low/40 bg-low/10 text-low",
};

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-faint">UNPROCESSED</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${PRIORITY_STYLE[priority]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {priority}
    </span>
  );
}

export function ThemeChips({ themes }: { themes: string[] | null }) {
  if (!themes?.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {themes.map((t) => (
        <span key={t} className="rounded border border-accent/25 bg-accent/5 px-2 py-0.5 text-[11px] text-accent">
          {THEME_BY_SLUG.get(t)?.name ?? t}
        </span>
      ))}
    </span>
  );
}

export function CountryList({ countries }: { countries: string[] | null }) {
  if (!countries?.length) return <span className="text-faint">Regional</span>;
  return <span>{countries.map((c) => COUNTRY_BY_ISO.get(c)?.name ?? c).join(", ")}</span>;
}

const VERIFICATION_LABEL: Record<string, string> = {
  official: "Official source",
  corroborated: "Corroborated",
  single_source: "Single source",
  unverified: "Unverified",
};

export function Credibility({ confidence, status }: { confidence: number | null; status: string | null }) {
  if (confidence == null) return null;
  return (
    <span className="font-mono text-[11px] text-muted">
      CREDIBILITY {confidence}/100 · {VERIFICATION_LABEL[status ?? ""] ?? status}
    </span>
  );
}
