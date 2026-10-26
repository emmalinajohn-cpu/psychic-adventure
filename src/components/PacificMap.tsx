"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MAP_LAYERS, type MapLayer } from "@/lib/layers";

export interface MapCountry {
  iso2: string;
  name: string;
  subregion: string;
  x: number;
  y: number;
  score: number | null;
  band: "Low" | "Guarded" | "Elevated" | "High" | null;
  events: number;
  movement: "up" | "down" | "steady" | null;
  priorities: { name: string; score: number; movement: "up" | "down" | "steady" | null }[];
}

export interface MapPin {
  key: string;
  id: number;
  x: number;
  y: number;
  title: string;
  url: string;
  at: string;
  source: string;
  layers: string[];
  location: string | null;
  priority: "high" | "medium" | "low";
  confidence: number;
  verification: string;
  summary: string;
  precision: "exact" | "country";
  country: string | null;
}

const BAND_COLOR = { Low: "#34d399", Guarded: "#60a5fa", Elevated: "#fbbf24", High: "#f87171" } as const;
const ARROW = { up: "▲", down: "▼", steady: "■" } as const;
const LAYER_KEYS = Object.keys(MAP_LAYERS) as MapLayer[];

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Fiji" }).format(new Date(iso));
}

export function PacificMap({ width, height, land, countries, pins }: { width: number; height: number; land: string; countries: MapCountry[]; pins: MapPin[] }) {
  const [active, setActive] = useState<Set<MapLayer>>(() => new Set(LAYER_KEYS));
  const [selected, setSelected] = useState<{ kind: "country"; iso2: string } | { kind: "pin"; key: string } | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(LAYER_KEYS.map((k) => [k, 0])) as Record<MapLayer, number>;
    const seen = new Set<number>();
    for (const p of pins) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      for (const l of p.layers) if (l in c) c[l as MapLayer]++;
    }
    return c;
  }, [pins]);

  const visible = pins.filter((p) => p.layers.some((l) => active.has(l as MapLayer)));
  const toggle = (l: MapLayer) =>
    setActive((s) => {
      const n = new Set(s);
      if (n.has(l)) n.delete(l);
      else n.add(l);
      return n;
    });

  const country = selected?.kind === "country" ? countries.find((c) => c.iso2 === selected.iso2) : null;
  const pin = selected?.kind === "pin" ? pins.find((p) => p.key === selected.key) : null;
  const countryPins = country ? visible.filter((p) => p.country === country.iso2).slice(0, 8) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {LAYER_KEYS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => toggle(l)}
            aria-pressed={active.has(l)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${active.has(l) ? "border-line bg-panel text-ink" : "border-line/50 text-faint"}`}
          >
            <span className="size-2 rounded-full" style={{ background: active.has(l) ? MAP_LAYERS[l].color : "transparent", border: `1px solid ${MAP_LAYERS[l].color}` }} />
            {MAP_LAYERS[l].label} · {counts[l]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="panel overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="Map of Pacific Island Countries and Territories">
            <rect width={width} height={height} fill="#081325" />
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={(i + 1) * (width / 10)} x2={(i + 1) * (width / 10)} y1={0} y2={height} stroke="#12233d" strokeDasharray="2 6" />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={`h${i}`} x1={0} x2={width} y1={(i + 1) * (height / 6)} y2={(i + 1) * (height / 6)} stroke="#12233d" strokeDasharray="2 6" />
            ))}
            <path d={land} fill="#1b2a40" stroke="#2a3d58" strokeWidth={0.6} />

            {visible.map((p) => {
              const layer = (p.layers.find((l) => active.has(l as MapLayer)) ?? p.layers[0]) as MapLayer;
              const isSel = pin?.key === p.key;
              return (
                <circle
                  key={p.key}
                  cx={p.x}
                  cy={p.y}
                  r={isSel ? 6 : p.priority === "high" ? 4.5 : 3.5}
                  fill={p.precision === "exact" ? MAP_LAYERS[layer].color : "transparent"}
                  stroke={MAP_LAYERS[layer].color}
                  strokeWidth={1.6}
                  strokeDasharray={p.precision === "country" ? "2 1.5" : undefined}
                  className="cursor-pointer"
                  onClick={() => setSelected({ kind: "pin", key: p.key })}
                >
                  <title>{p.title}</title>
                </circle>
              );
            })}

            {countries.map((c) => {
              const color = c.band ? BAND_COLOR[c.band] : "#5b6b80";
              const isSel = country?.iso2 === c.iso2;
              return (
                <g key={c.iso2} className="cursor-pointer" onClick={() => setSelected({ kind: "country", iso2: c.iso2 })}>
                  {isSel ? <circle cx={c.x} cy={c.y} r={12} fill="none" stroke={color} strokeOpacity={0.6} /> : null}
                  <circle cx={c.x} cy={c.y} r={6.5} fill={color} fillOpacity={c.band ? 0.9 : 0.35} stroke="#081325" strokeWidth={1.5} />
                  <text x={c.x + 10} y={c.y + 4} fontSize={11} fill="#c7d2e0" style={{ paintOrder: "stroke" }} stroke="#081325" strokeWidth={3}>
                    {c.name}
                    {c.score != null ? ` · ${c.score}` : ""}
                  </text>
                  <title>{c.name}</title>
                </g>
              );
            })}
          </svg>
          <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {(Object.keys(BAND_COLOR) as (keyof typeof BAND_COLOR)[]).map((b) => (
              <span key={b} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: BAND_COLOR[b] }} />{b}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-faint/50" />Insufficient data</span>
            <span>● exact location · ◌ country-level, indicative</span>
          </div>
        </div>

        <aside className="panel p-5">
          {country ? (
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-semibold">{country.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-faint">{country.subregion}</p>
                </div>
                {country.score != null ? (
                  <div className="text-right">
                    <p className="text-3xl font-semibold" style={{ color: BAND_COLOR[country.band!] }}>{country.score}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {country.band} {country.movement ? ARROW[country.movement] : ""}
                    </p>
                  </div>
                ) : null}
              </div>
              {country.score == null ? (
                <p className="mt-3 text-sm text-muted">Insufficient data: {country.events} approved event{country.events === 1 ? "" : "s"} in the last 90 days, so no risk score yet.</p>
              ) : (
                <>
                  <p className="mt-3 text-xs text-muted">Based on {country.events} approved events in the last 90 days.</p>
                  <p className="mt-4 eyebrow">Security priorities</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {country.priorities.map((p) => (
                      <li key={p.name} className="flex justify-between"><span>{p.name}</span><span className="font-mono">{p.score} {p.movement ? ARROW[p.movement] : ""}</span></li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-4 eyebrow">Recent developments</p>
              {countryPins.length ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {countryPins.map((p) => (
                    <li key={p.key}><a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{p.title}</a><span className="block text-xs text-faint">{p.source} · {fmt(p.at)}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">No mapped reporting in this period on the selected layers.</p>
              )}
              <Link href={`/dashboard/countries/${country.iso2}`} className="btn mt-4 w-full justify-center">Open full profile →</Link>
            </div>
          ) : pin ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: MAP_LAYERS[pin.layers[0] as MapLayer]?.color }}>
                {pin.layers.map((l) => MAP_LAYERS[l as MapLayer]?.label ?? l).join(" · ")}
              </p>
              <a href={pin.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-lg font-semibold leading-snug hover:text-accent">{pin.title}</a>
              <dl className="mt-4 grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                <dt className="text-muted">Location</dt><dd>{pin.location ?? "Not stated"}</dd>
                <dt className="text-muted">Precision</dt><dd>{pin.precision === "exact" ? "Coordinates published by the source" : "Country-level, indicative pin"}</dd>
                <dt className="text-muted">Date</dt><dd>{fmt(pin.at)}</dd>
                <dt className="text-muted">Source</dt><dd>{pin.source}</dd>
                <dt className="text-muted">Credibility</dt><dd>{pin.confidence}/100 · {pin.verification.replace("_", " ")}</dd>
                <dt className="text-muted">Priority</dt><dd className="capitalize">{pin.priority}</dd>
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-ink/85">{pin.summary}</p>
            </div>
          ) : (
            <div className="text-sm text-muted">
              <p className="font-medium text-ink">Click a country or a pin</p>
              <p className="mt-2">Countries are coloured by the activity-based risk index. Pins show approved reporting on the selected layers.</p>
              <p className="mt-2">{visible.length} pins shown.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
