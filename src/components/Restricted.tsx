import Link from "next/link";

export function Restricted({ title, note }: { title?: string; note?: string }) {
  return (
    <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-2xl" aria-hidden>
        🔒
      </div>
      <p className="font-semibold">Restricted Access</p>
      <p className="text-sm text-muted">Available to authorised users only</p>
      {title ? <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-faint">{title}</p> : null}
      {note ? <p className="max-w-md text-sm text-muted">{note}</p> : null}
      <div className="mt-3 flex gap-2">
        <Link href="/request-access" className="btn btn-primary">Request access</Link>
        <Link href="/sign-in" className="btn">Sign in</Link>
      </div>
    </div>
  );
}
