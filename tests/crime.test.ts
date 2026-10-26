import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { describe, expect, it } from "vitest";
import { applyReview, cleanDraft, DraftSchema, seizureTotals, type Draft } from "../src/lib/crime";

const seizure = (over: Partial<Draft["seizures"][number]>): Draft["seizures"][number] => ({
  commodity: "methamphetamine", description: "d", quantity: null, unit: null, country: "FJ", date: null, sources: [1], ...over,
});

const draft: Draft = {
  bottom_line: "  Bottom line.  ",
  key_judgements: [
    { statement: "Supported", likelihood: "likely", sources: [2, 2, 1, 9] },
    { statement: "Unsupported", likelihood: "likely", sources: [0, 7] },
  ],
  indicators: [{ title: "Route", description: "d", likelihood: "realistic_possibility", sources: [3] }],
  enforcement_gaps: [{ gap: "g", consequence: "c", countries: ["TO"], sources: [] }],
  seizures: [seizure({ date: "12 May 2026" }), seizure({ date: "2026-05-12" })],
  information_gaps: ["  gap ", ""],
};

describe("cleanDraft", () => {
  it("keeps only citations to real reports and drops findings left without any", () => {
    const c = cleanDraft(draft, 3);
    expect(c.bottom_line).toBe("Bottom line.");
    expect(c.key_judgements).toEqual([{ statement: "Supported", likelihood: "likely", sources: [1, 2] }]);
    expect(c.indicators).toHaveLength(1);
    expect(c.enforcement_gaps).toEqual([]);
    expect(c.seizures.map((s) => s.date)).toEqual([null, "2026-05-12"]);
    expect(c.information_gaps).toEqual(["gap"]);
  });
});

describe("applyReview", () => {
  it("keeps only ticked findings and takes the edited bottom line", () => {
    const r = applyReview(draft, new Set(["key_judgements:1", "seizures:0"]), "Edited.");
    expect(r.bottom_line).toBe("Edited.");
    expect(r.key_judgements.map((k) => k.statement)).toEqual(["Unsupported"]);
    expect(r.indicators).toEqual([]);
    expect(r.seizures).toHaveLength(1);
    expect(applyReview(draft, new Set(), "  ").bottom_line).toBe(draft.bottom_line);
  });
});

describe("seizureTotals", () => {
  it("sums quantities per commodity and unit and counts seizures without one", () => {
    const t = seizureTotals([
      seizure({ quantity: 12.5, unit: "kg" }),
      seizure({ quantity: 2.5, unit: " KG" }),
      seizure({}),
      seizure({ commodity: "firearms", quantity: 4, unit: "firearms" }),
    ]);
    expect(t).toEqual([
      { commodity: "methamphetamine", unit: "kg", quantity: 15, count: 2 },
      { commodity: "firearms", unit: "firearms", quantity: 4, count: 1 },
      { commodity: "methamphetamine", unit: null, quantity: null, count: 1 },
    ]);
  });
});

it("the draft schema converts to a structured output format", () => {
  expect(() => betaZodOutputFormat(DraftSchema)).not.toThrow();
});
