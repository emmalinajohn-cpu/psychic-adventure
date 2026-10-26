import { ROLE_LABELS } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { updateUser } from "../actions";

export const metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const users = await sql<{ id: string; full_name: string; email: string; organisation: string; role: keyof typeof ROLE_LABELS; status: string; decided_at: Date | null }[]>`
    select id, full_name, email, organisation, role, status, decided_at from users where status in ('approved', 'suspended') order by full_name`;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left font-mono text-[11px] uppercase tracking-widest text-faint">
          <tr><th className="px-4 py-3">Name</th><th>Organisation</th><th>Approved</th><th className="px-4">Role and status</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3"><p>{u.full_name}</p><p className="text-xs text-muted">{u.email}</p></td>
              <td className="text-muted">{u.organisation}</td>
              <td className="text-muted">{u.decided_at ? formatDate(u.decided_at) : ""}</td>
              <td className="px-4">
                <form action={updateUser} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="input w-auto text-sm">
                    {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <select name="status" defaultValue={u.status} className="input w-auto text-sm">
                    <option value="approved">Active</option><option value="suspended">Suspended</option>
                  </select>
                  <button className="btn">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
