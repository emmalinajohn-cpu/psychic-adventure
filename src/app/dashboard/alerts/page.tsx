import { CountryList, PriorityBadge } from "@/components/Badges";
import { formatDateTime } from "@/lib/format";
import { activeAlerts } from "@/lib/queries";

export const metadata = { title: "Alert Centre" };

export default async function AlertsPage() {
  const alerts = await activeAlerts(200);
  return (
    <div>
      <p className="eyebrow">Alert centre</p>
      <h1 className="mt-1 text-2xl font-bold">Active alerts</h1>
      <p className="mt-1 text-sm text-muted">Raised automatically by the alert rules from events with at least one approved report.</p>
      <div className="panel mt-6 overflow-x-auto">
        {alerts.length ? (
          <table className="w-full text-sm">
            <thead className="text-left font-mono text-[11px] uppercase tracking-widest text-faint">
              <tr><th className="px-4 py-3">Priority</th><th>Alert</th><th>Category</th><th>Countries</th><th className="text-right">Sources</th><th className="px-4">Last updated</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3"><PriorityBadge priority={a.priority} /></td>
                  <td className="max-w-md">{a.title}</td>
                  <td className="text-muted">{a.category}</td>
                  <td className="text-muted"><CountryList countries={a.countries} /></td>
                  <td className="text-right font-mono">{a.source_count}</td>
                  <td className="whitespace-nowrap px-4 text-muted">{formatDateTime(a.last_updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">No active alerts.</p>
        )}
      </div>
    </div>
  );
}
