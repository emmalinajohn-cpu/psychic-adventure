import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land50 from "world-atlas/land-50m.json";

// The Pacific frame: Palau in the west to Pitcairn in the east, Guam/CNMI to the
// Tropic of Capricorn. Rotated so the antimeridian runs through the middle.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 560;

let cached: { projection: GeoProjection; land: string } | null = null;

export function pacificProjection() {
  if (cached) return cached;
  const projection = geoMercator()
    .rotate([-180, 0])
    .center([0, -4])
    .scale(560)
    .translate([MAP_WIDTH / 2 - 40, MAP_HEIGHT / 2])
    .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]);
  const topo = land50 as unknown as Topology<{ land: GeometryCollection }>;
  const land = geoPath(projection)(feature(topo, topo.objects.land)) ?? "";
  cached = { projection, land };
  return cached;
}

export function project(lon: number, lat: number): [number, number] | null {
  const p = pacificProjection().projection([lon, lat]);
  if (!p || p[0] < 0 || p[0] > MAP_WIDTH || p[1] < 0 || p[1] > MAP_HEIGHT) return null;
  return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
}

/** Spread pins that share a country-level position on a small spiral, deterministically. */
export function spiralOffset(index: number): [number, number] {
  if (index === 0) return [0, 0];
  const angle = index * 2.4;
  const r = 7 + 3.2 * Math.sqrt(index);
  return [Math.round(Math.cos(angle) * r * 10) / 10, Math.round(Math.sin(angle) * r * 10) / 10];
}
