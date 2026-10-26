import { formatDateTime } from "@/lib/format";
import { sourceStatuses } from "@/lib/queries";
import { updateSource } from "../actions";

export const metadata = { title: "Sources" };

export default async function SourcesPage() {
  const sources = await sourceStatuses();
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left font-mono text-[11px] uppercase tracking-widest text-faint">
          <tr><th className="px-4 py-3">Source</th><th>Type</th><th>Last check</th><th className="text-right">Items</th><th className="px-4">Credibility and status</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sources.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3"><a href={s.homepage} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{s.name}</a></td>
              <td className="text-muted">{s.kind}</td>
              <td>
                {s.last_run ? <span className={s.last_status === "ok" ? "text-good" : "text-high"}>{s.last_status} · {formatDateTime(s.last_run)}</span> : <span className="text-faint">never</span>}
                {s.last_error ? <p className="text-xs text-high">{s.last_error}</p> : null}
              </td>
              <td className="text-right font-mono">{s.items_total}</td>
              <td className="px-4">
                <form action={updateSource} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="base_credibility" type="number" min={0} max={100} defaultValue={s.base_credibility} className="input w-20 text-sm" />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={s.active} /> active</label>
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
