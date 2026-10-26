import { COUNTRIES } from "./reference";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One word-boundary regex per country, built from its name and aliases.
// Apostrophes vary between ' and ʻ in Pacific place names, so both are accepted.
const PATTERNS = COUNTRIES.map((c) => {
  const terms = [c.name, ...c.aliases].map((t) => escapeRegex(t).replace(/'/g, "['ʻ’]?"));
  return { iso2: c.iso2, re: new RegExp(`(^|[^\\p{L}])(${terms.join("|")})(?=$|[^\\p{L}])`, "iu") };
});

/** ISO codes of every Pacific country or territory the text mentions. */
export function matchCountries(text: string): string[] {
  const found = PATTERNS.filter((p) => p.re.test(text)).map((p) => p.iso2);
  // "Samoa" also matches inside "American Samoa"; keep WS only if it appears on its own
  if (found.includes("AS") && found.includes("WS")) {
    const withoutAmerican = text.replace(/American\s+Samoa/giu, "");
    if (!PATTERNS.find((p) => p.iso2 === "WS")!.re.test(withoutAmerican)) {
      return found.filter((c) => c !== "WS");
    }
  }
  return found;
}

const REGIONAL_TERMS = /\b(Pacific Islands?|Pacific Island Countries|Blue Pacific|Pacific Islands Forum|Melanesia|Micronesia|Polynesia|South Pacific)\b/i;

/** True when an item from a general (non-Pacific) source is about the Pacific. */
export function isPacificRelevant(text: string): boolean {
  return REGIONAL_TERMS.test(text) || matchCountries(text).length > 0;
}
