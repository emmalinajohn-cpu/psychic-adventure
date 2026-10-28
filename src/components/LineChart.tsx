// Server-rendered multi-series line chart. Kept dependency-free so it renders
// with the page and needs no client JavaScript.

export const THEME_COLORS: Record<string, string> = {
  "climate-security": "#fbbf24",
  "maritime-security": "#22d3ee",
  "cyber-security": "#f472b6",
  "human-security": "#34d399",
  "economic-security": "#a3e635",
  "strategic-competition": "#a78bfa",
  "governance-stability": "#fb923c",
  "transnational-crime": "#f87171",
};

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const W = 900;
const PAD = { top: 12, right: 16, bottom: 28, left: 36 };

function niceMax(n: number) {
  if (n <= 5) return 5;
  const mag = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / mag) * mag;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(y, mo - 1, 1)));
}

export function LineChart({ months, series, height = 280 }: { months: string[]; series: Series[]; height?: number }) {
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (months.length <= 1 ? innerW / 2 : (i / (months.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  const labelEvery = Math.max(1, Math.ceil(months.length / 12));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="block w-full" role="img" aria-label="Approved reports per month by theme">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#1c2a40" />
            <text x={PAD.left - 6} y={y(t) + 3} fontSize={10} textAnchor="end" fill="#5b6b80">{t}</text>
          </g>
        ))}
        {months.map((m, i) =>
          i % labelEvery === 0 ? (
            <text key={m} x={x(i)} y={height - 8} fontSize={10} textAnchor="middle" fill="#5b6b80">{monthLabel(m)}</text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.key}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={months.length > 24 ? 0 : 2.5} fill={s.color}>
                <title>{`${s.label}, ${monthLabel(months[i])}: ${v}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
