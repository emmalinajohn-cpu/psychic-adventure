import Link from "next/link";
import { Freshness } from "@/components/Freshness";
import { ItemCard } from "@/components/ItemCard";
import { Restricted } from "@/components/Restricted";
import { ThemeBars } from "@/components/ThemeBars";
import { formatDate } from "@/lib/format";
import { countrySummaries, lastCollection, publicBriefs, publicSignals, themeTrends, totals } from "@/lib/queries";

export const dynamic = "force-dynamic";

function Section({ n, title, lead, children }: { n: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <p className="eyebrow">{n} · {title}</p>
      {lead ? <p className="mt-2 max-w-3xl text-muted">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="panel px-5 py-8 text-center text-sm text-muted">{children}</p>;
}

export default async function Home() {
  const [t, trends, briefs, signals, countries, last] = await Promise.all([
    totals(), themeTrends(), publicBriefs(4), publicSignals(6), countrySummaries(), lastCollection(),
  ]);

  const stats = [
    { value: 22, label: "Countries and territories monitored" },
    { value: t.sources_active, label: "Sources monitored" },
    { value: t.approved_30d, label: "Verified reports, last 30 days" },
    { value: t.active_alerts, label: "Active alerts" },
  ];

  return (
    <>
      <div className="grid-bg border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:py-24">
          <div>
            <p className="inline-block rounded border border-accent/30 bg-accent/5 px-3 py-1.5 eyebrow">Pacific Security Intelligence</p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Understand Pacific security as it develops</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Evidence-based monitoring and analysis of climate, maritime, cyber, economic, strategic and transnational crime developments
              across Pacific Island Countries and Territories.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/request-access" className="btn btn-primary px-6 py-3">Request Access →</Link>
              <Link href="/briefs" className="btn px-6 py-3">View Public Briefs</Link>
            </div>
            <p className="mt-6 text-xs text-faint">🔒 Access granted by vetting and administrator approval, not by subscription.</p>
          </div>
          <div className="panel self-start p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Regional telemetry</p>
              <Freshness initial={last?.toISOString() ?? null} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg border border-line bg-panel-2 p-4">
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="mt-1 text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            {last ? <p className="mt-3 font-mono text-[10px] text-faint">Last collection {formatDate(last)}</p> : null}
          </div>
        </div>
      </div>

      <Section n="01" title="Regional security snapshot" lead="How much verified reporting each security theme drew across the region in the last 30 days, against the 30 days before.">
        <div className="panel p-6">
          {t.approved_items === 0 ? (
            <p className="text-sm text-muted">No verified reports yet. The snapshot fills in as analysts approve collected items.</p>
          ) : (
            <ThemeBars trends={trends} />
          )}
        </div>
      </Section>

      <Section n="02" title="Latest public intelligence briefs">
        {briefs.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {briefs.map((b) => <ItemCard key={b.id} item={b} />)}
          </div>
        ) : (
          <Empty>No public briefs have been released yet.</Empty>
        )}
        <Link href="/briefs" className="mt-4 inline-block text-sm text-accent">All public briefs →</Link>
      </Section>

      <Section n="03" title="Emerging security signals" lead="High and medium priority developments released to the public.">
        {signals.length ? (
          <ul className="panel divide-y divide-line">
            {signals.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{s.title}</a>
                <span className="font-mono text-[11px] text-faint">{s.source_name} · {formatDate(s.published_at ?? s.fetched_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No public signals yet.</Empty>
        )}
      </Section>

      <Section n="04" title="Country overview" lead="Verified reports per country in the last 30 days. Full profiles and risk assessments are restricted.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {countries.map((c) => (
            <div key={c.iso2} className="panel p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{c.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-faint">{c.subregion}</p>
              </div>
              <p className="mt-2 text-sm text-muted">
                {c.items_30d ? `${c.items_30d} report${c.items_30d === 1 ? "" : "s"} in 30 days` : "No verified reports in 30 days"}
              </p>
              {c.top_theme ? <p className="mt-1 text-xs text-accent">Most reported: {c.top_theme}</p> : null}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Restricted title="Country profiles · risk assessments · trend analysis" />
        </div>
      </Section>

      <Section n="05" title="About Pacific Watchmen">
        <div className="panel grid gap-6 p-6 md:grid-cols-3">
          <p className="text-sm leading-relaxed text-muted md:col-span-2">
            Pacific Watchmen works as an intelligence fusion centre. It continuously collects reporting from regional organisations,
            governments, Pacific media and research institutes, extracts and categorises each item, scores source credibility, merges
            duplicate reports into single events, and puts every item in front of an analyst before it is used.
          </p>
          <Link href="/about" className="btn self-start">How the platform works →</Link>
        </div>
      </Section>

      <Section n="06" title="Request access">
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="max-w-2xl text-sm text-muted">
            For government agencies, defence and police personnel, policy analysts, researchers, regional organisations, universities and
            development partners. Every request is reviewed by an administrator.
          </p>
          <Link href="/request-access" className="btn btn-primary">Request Access →</Link>
        </div>
      </Section>
    </>
  );
}
