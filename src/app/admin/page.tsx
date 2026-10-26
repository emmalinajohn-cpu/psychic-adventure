import { ROLE_LABELS } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { decideRequest } from "./actions";

export const metadata = { title: "Access Requests" };

export default async function AccessRequests() {
  const pending = await sql<{ id: string; full_name: string; email: string; organisation: string; position: string; intended_use: string; created_at: Date }[]>`
    select id, full_name, email, organisation, position, intended_use, created_at from users where status = 'pending' order by created_at`;
  const unverified = await sql<{ n: number }[]>`select count(*)::int as n from users where status = 'unverified'`;
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        {pending.length} pending access request{pending.length === 1 ? "" : "s"} · {unverified[0].n} awaiting email verification
      </p>
      <div className="mt-4 space-y-3">
        {pending.map((u) => (
          <div key={u.id} className="panel flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p><span className="font-semibold">{u.full_name}</span> <span className="text-sm text-muted">{u.email}</span></p>
              <p className="text-sm">{u.position} · {u.organisation}</p>
              <p className="mt-3 rounded-lg border border-line bg-bg p-3 text-sm"><span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-faint">Intended use</span>{u.intended_use}</p>
              <p className="mt-2 font-mono text-[10px] text-faint">Submitted {formatDateTime(u.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={decideRequest} className="flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="decision" value="approve" />
                <select name="role" defaultValue="analyst" className="input w-auto text-sm">
                  {(["analyst", "senior_analyst", "admin"] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button className="btn btn-good">✓ Approve</button>
              </form>
              <form action={decideRequest}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="decision" value="reject" />
                <button className="btn btn-bad">✕ Deny</button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 ? <p className="panel px-5 py-8 text-center text-sm text-muted">No requests waiting.</p> : null}
      </div>
    </div>
  );
}
