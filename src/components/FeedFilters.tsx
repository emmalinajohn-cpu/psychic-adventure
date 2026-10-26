import { COUNTRIES, THEMES } from "@/lib/reference";

export function FeedFilters({ action, values, hide = [] }: { action: string; values: { q?: string; country?: string; theme?: string; priority?: string }; hide?: string[] }) {
  return (
    <form action={action} className="panel flex flex-wrap items-end gap-3 p-4 text-sm">
      <label className="min-w-48 flex-1">
        <span className="text-xs text-muted">Search</span>
        <input name="q" defaultValue={values.q} className="input mt-1" placeholder="e.g. shiprider, cyclone, fisheries" />
      </label>
      {hide.includes("country") ? null : (
        <label>
          <span className="text-xs text-muted">Country</span>
          <select name="country" defaultValue={values.country ?? ""} className="input mt-1">
            <option value="">All</option>
            {COUNTRIES.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
          </select>
        </label>
      )}
      {hide.includes("theme") ? null : (
        <label>
          <span className="text-xs text-muted">Theme</span>
          <select name="theme" defaultValue={values.theme ?? ""} className="input mt-1">
            <option value="">All</option>
            {THEMES.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </label>
      )}
      <label>
        <span className="text-xs text-muted">Priority</span>
        <select name="priority" defaultValue={values.priority ?? ""} className="input mt-1">
          <option value="">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </label>
      <button className="btn btn-primary">Apply</button>
    </form>
  );
}
