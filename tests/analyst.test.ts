import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { parseAnswer, toSearchResult } from "../src/lib/analyst";

const cite = (i: number) => ({
  type: "search_result_location" as const, search_result_index: i, source: "u", title: "t", cited_text: "x", start_block_index: 0, end_block_index: 0,
});

describe("parseAnswer", () => {
  it("maps search result citations to 1-based source numbers and merges uncited fragments", () => {
    const content = [
      { type: "text", text: "Patrols increased", citations: [cite(2), cite(0), cite(2)] },
      { type: "text", text: ", and ", citations: null },
      { type: "text", text: "more.", citations: [] },
      { type: "text", text: "A vessel was seized.", citations: [cite(1)] },
    ] as unknown as Anthropic.Beta.BetaContentBlock[];
    expect(parseAnswer(content)).toEqual([
      { text: "Patrols increased", sources: [1, 3] },
      { text: ", and more.", sources: [] },
      { text: "A vessel was seized.", sources: [2] },
    ]);
  });

  it("ignores non-text blocks", () => {
    expect(parseAnswer([{ type: "thinking", thinking: "", signature: "s" }] as unknown as Anthropic.Beta.BetaContentBlock[])).toEqual([]);
  });
});

describe("toSearchResult", () => {
  it("builds a citable search result with names, credibility and summaries", () => {
    const block = toSearchResult({
      id: 1, title: "Patrol boat handed over", url: "https://example.org/p", description: null, at: new Date("2026-10-01T00:00:00Z"),
      source_name: "RNZ Pacific", countries: ["KI"], themes: ["maritime-security"], priority: "medium", confidence: 75,
      verification_status: "single_source", executive_summary: "S.", analyst_summary: "A.",
    });
    expect(block).toMatchObject({ type: "search_result", source: "https://example.org/p", title: "Patrol boat handed over", citations: { enabled: true } });
    const text = block.content[0].text;
    expect(text).toContain("Published: 2026-10-01 by RNZ Pacific");
    expect(text).toContain("Credibility: 75/100 (single source)");
    expect(text).toContain("Countries: Kiribati");
    expect(text).toContain("Themes: Maritime Security");
    expect(text).not.toContain("Source text");
  });
});
