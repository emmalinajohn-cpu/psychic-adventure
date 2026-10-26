import { describe, expect, it } from "vitest";
import { bestMatch } from "../collector/dedupe";
import { maxPriority, priorityFor } from "../src/lib/priority";
import { titleSimilarity } from "../src/lib/similarity";

describe("alert rules", () => {
  it("maps categories to the specified priority", () => {
    expect(priorityFor("security_agreement")).toBe("high");
    expect(priorityFor("natural_disaster")).toBe("high");
    expect(priorityFor("cyber_incident")).toBe("medium");
    expect(priorityFor("transnational_crime_incident")).toBe("medium");
    expect(priorityFor("commentary")).toBe("low");
  });

  it("keeps the higher priority when merging", () => {
    expect(maxPriority("low", "high")).toBe("high");
    expect(maxPriority("medium", "low")).toBe("medium");
  });
});

describe("de-duplication", () => {
  it("scores near-identical headlines as the same event", () => {
    const a = "Vanuatu declares state of emergency after cyclone";
    const b = "Cyclone: Vanuatu declares a state of emergency";
    expect(titleSimilarity(a, b)).toBeGreaterThan(0.6);
    expect(titleSimilarity(a, "Fiji signs fisheries agreement with Japan")).toBeLessThan(0.2);
  });

  it("picks the best candidate above the threshold", () => {
    const candidates = [
      { id: 1, titles: ["Fiji signs fisheries agreement with Japan"] },
      { id: 2, titles: ["Vanuatu cyclone: state of emergency declared", "Vanuatu declares state of emergency after cyclone"] },
    ];
    expect(bestMatch("Vanuatu declares a state of emergency after cyclone strikes", candidates)?.id).toBe(2);
    expect(bestMatch("Tonga election results announced", candidates)).toBeNull();
  });
});
