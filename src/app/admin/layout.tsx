import Link from "next/link";
import { Restricted } from "@/components/Restricted";
import { currentUser, hasRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!hasRole(user, "admin")) {
    return <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6"><Restricted title="Administrator tools" /></div>;
  }
  const tabs = [
    { href: "/admin", label: "Access Requests" },
    { href: "/admin/users", label: "Users & Roles" },
    { href: "/admin/sources", label: "Sources" },
    { href: "/admin/audit", label: "Audit Log" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Supervisory suite</p>
      <h1 className="mt-2 text-3xl font-bold">Administrator tools</h1>
      <p className="mt-1 text-muted">Approve access, assign roles, manage sources and review platform activity.</p>
      <nav className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border border-line bg-panel p-1 text-sm">
        {tabs.map((t) => <Link key={t.href} href={t.href} className="rounded-md px-3 py-1.5 text-muted hover:bg-panel-2 hover:text-ink">{t.label}</Link>)}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
