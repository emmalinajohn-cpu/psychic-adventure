import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit Log" };

export default async function AuditPage() {
  const rows = await sql<{ id: number; at: Date; action: string; target: string | null; who: string | null; detail: Record<string, unknown> }[]>`
    select l.id, l.at, l.action, l.target, u.full_name as who, l.detail
    from audit_log l left join users u on u.id = l.user_id order by l.at desc limit 300`;
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left font-mono text-[11px] uppercase tracking-widest text-faint">
          <tr><th className="px-4 py-3">When</th><th>Who</th><th>Action</th><th>Target</th><th className="px-4">Detail</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2 text-muted">{formatDateTime(r.at)}</td>
              <td>{r.who ?? <span className="text-faint">system</span>}</td>
              <td className="font-mono text-xs">{r.action}</td>
              <td className="text-muted">{r.target}</td>
              <td className="px-4 font-mono text-[11px] text-faint">{Object.keys(r.detail).length ? JSON.stringify(r.detail) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
