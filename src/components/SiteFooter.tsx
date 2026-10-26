import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <p className="font-semibold">OSINT - Pacific Watchmen</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Pacific Security Intelligence: a restricted-access regional intelligence and analytical capability supporting evidence-based
            understanding of climate, maritime, cyber, economic and strategic security developments across the Pacific.
          </p>
        </div>
        <div>
          <p className="eyebrow !text-faint">Public</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/briefs" className="hover:text-accent">Public briefs</Link></li>
            <li><Link href="/about" className="hover:text-accent">About the platform</Link></li>
            <li><Link href="/request-access" className="hover:text-accent">Request access</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow !text-faint">Coverage</p>
          <p className="mt-3 text-sm text-muted">22 Pacific Island Countries and Territories across Melanesia, Micronesia and Polynesia.</p>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center font-mono text-[10px] tracking-[0.25em] text-faint">
        ACCESS BY VETTING AND ADMINISTRATOR APPROVAL ONLY · NO SUBSCRIPTIONS
      </p>
    </footer>
  );
}
