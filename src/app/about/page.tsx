import Link from "next/link";
import { THEMES } from "@/lib/reference";
import { sourceStatuses } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

const STEPS = [
  ["Collect", "Every 15 minutes the collector checks each monitored source and stores new items."],
  ["Process", "Each item is read by an AI model that records countries, themes, entities and keywords, and writes an executive and analyst summary."],
  ["Validate", "Every item carries a credibility score from its source type, raised when independent sources report the same event."],
  ["Merge", "Reports of the same development from different outlets are merged into one event, keeping every source reference."],
  ["Review", "Nothing reaches a dashboard until an analyst approves it. Analysts can also discard items or release them publicly."],
  ["Alert", "Security agreements, instability, strategic competition, disasters and crises raise high-priority alerts; cyber, maritime, crime and policy events raise medium ones."],
];

export default async function AboutPage() {
  const sources = (await sourceStatuses()).filter((s) => s.active);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow">About</p>
      <h1 className="mt-2 text-3xl font-bold">Pacific Security Intelligence</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Pacific Watchmen is a restricted-access regional intelligence and analytical capability supporting evidence-based understanding of
        climate, maritime, cyber, economic and strategic security developments across the Pacific. It serves government agencies, defence
        personnel, policy analysts, researchers, regional organisations, universities, development partners and approved stakeholders.
      </p>

      <h2 className="mt-10 text-xl font-semibold">How it works</h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="panel flex gap-4 p-4">
            <span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span><span className="font-medium">{title}.</span> <span className="text-muted">{body}</span></span>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Security themes</h2>
      <p className="mt-3 text-muted">{THEMES.map((t) => t.name).join(" · ")}</p>

      <h2 className="mt-10 text-xl font-semibold">Sources currently monitored</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.id} className="panel flex items-center justify-between p-3 text-sm">
            <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{s.name}</a>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faint">{s.kind}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <Link href="/request-access" className="btn btn-primary">Request Access →</Link>
      </div>
    </div>
  );
}
