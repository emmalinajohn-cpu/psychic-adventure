import { describe, expect, it } from "vitest";
import { isPacificRelevant, matchCountries } from "../src/lib/match";
import { COUNTRIES, THEMES } from "../src/lib/reference";

describe("reference data", () => {
  it("covers the 22 Pacific Island Countries and Territories and 8 themes", () => {
    expect(COUNTRIES).toHaveLength(22);
    expect(new Set(COUNTRIES.map((c) => c.iso2)).size).toBe(22);
    expect(THEMES.map((t) => t.slug)).toContain("transnational-crime");
    expect(THEMES).toHaveLength(8);
  });
});

describe("matchCountries", () => {
  it("finds countries by name and alias", () => {
    expect(matchCountries("Police in Port Moresby and Honiara").sort()).toEqual(["PG", "SB"]);
    expect(matchCountries("Nuku'alofa talks")).toEqual(["TO"]);
  });

  it("does not count American Samoa as Samoa", () => {
    expect(matchCountries("Storm hits American Samoa")).toEqual(["AS"]);
    expect(matchCountries("American Samoa and Samoa sign pact").sort()).toEqual(["AS", "WS"]);
  });

  it("needs whole words", () => {
    expect(matchCountries("Fijian")).toEqual(["FJ"]);
    expect(matchCountries("Lapalau")).toEqual([]);
  });

  it("flags Pacific relevance for general sources", () => {
    expect(isPacificRelevant("Pacific Islands Forum leaders meet")).toBe(true);
    expect(isPacificRelevant("Australian budget update")).toBe(false);
  });
});
