export function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {sub ? <p className="mt-1 font-mono text-xs text-faint">{sub}</p> : null}
    </div>
  );
}
