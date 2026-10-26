import Link from "next/link";
import { Restricted } from "@/components/Restricted";
import { currentUser, hasRole, ROLE_LABELS } from "@/lib/auth";
import { THEMES } from "@/lib/reference";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!hasRole(user, "analyst")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Restricted title="Intelligence dashboard" note={user ? "Your account isn't approved for analyst access yet." : undefined} />
      </div>
    );
  }
  const nav = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/review", label: "Review Queue" },
    { href: "/dashboard/feed", label: "Intelligence Feed" },
    { href: "/dashboard/alerts", label: "Alert Centre" },
    { href: "/dashboard/map", label: "Pacific Map" },
    { href: "/dashboard/risk", label: "Risk Assessment" },
    { href: "/dashboard/trends", label: "Trend Analysis" },
    { href: "/dashboard/countries", label: "Country Profiles" },
  ];
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-4">
        <div className="panel p-4">
          <p className="eyebrow">Clearance</p>
          <p className="mt-2 font-medium">{user.full_name}</p>
          <p className="text-sm text-muted">{ROLE_LABELS[user.role]}</p>
        </div>
        <nav className="space-y-1 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-muted hover:bg-panel hover:text-ink">{n.label}</Link>
          ))}
          <p className="px-3 pt-4 font-mono text-[10px] uppercase tracking-widest text-faint">Security dashboards</p>
          {THEMES.map((t) => (
            <Link key={t.slug} href={`/dashboard/themes/${t.slug}`} className="block rounded-lg px-3 py-2 text-muted hover:bg-panel hover:text-ink">{t.name}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
