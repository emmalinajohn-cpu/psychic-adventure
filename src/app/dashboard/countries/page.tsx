import Link from "next/link";
import { formatDate } from "@/lib/format";
import { countrySummaries } from "@/lib/queries";

export const metadata = { title: "Country Profiles" };

export default async function CountriesPage() {
  const countries = await countrySummaries();
  const regions = ["Melanesia", "Micronesia", "Polynesia"] as const;
  return (
    <div>
      <p className="eyebrow">Country profiles</p>
      <h1 className="mt-1 text-2xl font-bold">22 Pacific Island Countries and Territories</h1>
      {regions.map((r) => (
        <section key={r} className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">{r}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {countries.filter((c) => c.subregion === r).map((c) => (
              <Link key={c.iso2} href={`/dashboard/countries/${c.iso2}`} className="panel block p-4 hover:border-accent">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{c.name}</p>
                  <p className="font-mono text-xs text-faint">{c.iso2}</p>
                </div>
                <p className="mt-2 text-sm text-muted">{c.items_30d} reports in 30 days{c.high_30d ? ` · ${c.high_30d} high priority` : ""}</p>
                <p className="mt-1 text-xs text-faint">{c.latest_at ? `Latest ${formatDate(c.latest_at)}` : "No approved reporting yet"}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
