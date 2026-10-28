import { describe, expect, it } from "vitest";
import { parseFeed } from "../collector/feeds";
import { MAP_HEIGHT, MAP_WIDTH, project, spiralOffset } from "../src/lib/geo";
import { COUNTRIES, THEMES } from "../src/lib/reference";
import { band, movement, scoreFrom } from "../src/lib/risk";
import { monthsBetween, narrative, type TrendResult } from "../src/lib/trends";

describe("risk index", () => {
  it("maps weighted sums onto 0-100 with saturation", () => {
    expect(scoreFrom(0)).toBe(0);
    expect(scoreFrom(20)).toBe(63);
    expect(scoreFrom(1000)).toBe(100);
  });
  it("bands scores", () => {
    expect([0, 24, 25, 49, 50, 74, 75, 100].map(band)).toEqual(["Low", "Low", "Guarded", "Guarded", "Elevated", "Elevated", "High", "High"]);
  });
  it("reports movement only when both windows have scores", () => {
    const s = (score: number | null, previous: number | null) => ({ score, previous, events: 3, previousEvents: 3, band: null });
    expect(movement(s(60, 50))).toBe("up");
    expect(movement(s(40, 50))).toBe("down");
    expect(movement(s(52, 50))).toBe("steady");
    expect(movement(s(52, null))).toBeNull();
  });
});

describe("map projection", () => {
  it("places every one of the 22 capitals inside the frame", () => {
    expect(COUNTRIES).toHaveLength(22);
    for (const c of COUNTRIES) {
      const p = project(c.lon, c.lat);
      expect(p, c.name).not.toBeNull();
      expect(p![0]).toBeGreaterThan(0);
      expect(p![0]).toBeLessThan(MAP_WIDTH);
      expect(p![1]).toBeLessThan(MAP_HEIGHT);
    }
  });
  it("rejects points outside the Pacific frame", () => {
    expect(project(0, 51.5)).toBeNull(); // London
  });
  it("spreads stacked pins deterministically", () => {
    expect(spiralOffset(0)).toEqual([0, 0]);
    expect(spiralOffset(3)).toEqual(spiralOffset(3));
    expect(spiralOffset(1)).not.toEqual(spiralOffset(2));
  });
});

describe("trends", () => {
  it("lists months inclusively across year boundaries", () => {
    expect(monthsBetween(new Date("2025-11-15T00:00:00Z"), new Date("2026-02-01T00:00:00Z"))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("writes the narrative from the numbers only", () => {
    const zero = Object.fromEntries(THEMES.map((t) => [t.slug, 0]));
    const r: TrendResult = {
      months: [], series: {}, coverageStart: null,
      current: { ...zero, "maritime-security": 12, "transnational-crime": 4 },
      previous: { ...zero, "maritime-security": 6 },
    };
    const names = new Map(THEMES.map((t) => [t.slug, t.name]));
    const lines = narrative(r, names, "year");
    expect(lines[0]).toBe("16 approved reports in the selected year, up 167% on the preceding period (6).");
    expect(lines).toContain("Maritime Security reporting rose 100% against the preceding period.");
    expect(lines.at(-1)).toBe("New activity with no approved reporting in the preceding period: Transnational Crime.");
    expect(narrative({ ...r, current: zero }, names, "year")).toEqual(["No approved reporting in the selected year."]);
  });
});

describe("feed coordinates", () => {
  it("reads georss points", () => {
    const xml = `<rss xmlns:georss="http://www.georss.org/georss"><channel><item><title>Quake</title><link>https://example.org/q</link><georss:point>-17.7 178.1</georss:point></item></channel></rss>`;
    expect(parseFeed(xml)[0]).toMatchObject({ lat: -17.7, lon: 178.1 });
  });
});
