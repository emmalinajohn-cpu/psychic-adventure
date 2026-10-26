import Link from "next/link";
import { currentUser, hasRole, ROLE_LABELS } from "@/lib/auth";
import { Wordmark } from "./Logo";

export async function SiteHeader() {
  const user = await currentUser();
  const analyst = hasRole(user, "analyst");
  const admin = hasRole(user, "admin");
  const links = [
    { href: "/", label: "Home" },
    { href: "/briefs", label: "Public Briefs" },
    { href: "/about", label: "About" },
    ...(analyst ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="Pacific Watchmen home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-muted hover:bg-panel hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/account" className="rounded border border-line px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-accent">
                {user.status === "approved" ? ROLE_LABELS[user.role] : user.status}
              </Link>
              <form action="/sign-out" method="post">
                <button className="btn" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="px-3 py-1.5 text-ink/90 hover:text-accent">Sign in</Link>
              <Link href="/request-access" className="btn btn-primary">Request Access</Link>
            </>
          )}
        </div>
        <nav className="flex w-full gap-1 overflow-x-auto text-sm md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-muted hover:bg-panel hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
