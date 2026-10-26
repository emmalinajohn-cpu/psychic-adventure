// The starting set of monitored sources. Every feed URL here was checked by hand
// on 2026-10-26. Administrators can adjust credibility or deactivate sources;
// the seed only inserts sources that don't exist yet.

export type SourceKind = "regional" | "government" | "media" | "research" | "aggregator";

export interface SourceSeed {
  slug: string;
  name: string;
  kind: SourceKind;
  homepage: string;
  feedUrl: string;
  feedType: "rss" | "guardian" | "reliefweb";
  countryIso?: string;
  baseCredibility: number;
  pacificFocused: boolean;
  active: boolean;
}

// Base credibility by source type: official and regional bodies first,
// established media next, then research and commentary.
export const DEFAULT_CREDIBILITY: Record<SourceKind, number> = {
  regional: 90,
  government: 85,
  aggregator: 80,
  media: 75,
  research: 70,
};

export const SOURCE_SEEDS: SourceSeed[] = [
  {
    slug: "ffa",
    name: "Pacific Islands Forum Fisheries Agency",
    kind: "regional",
    homepage: "https://www.ffa.int",
    feedUrl: "https://www.ffa.int/feed/",
    feedType: "rss",
    baseCredibility: DEFAULT_CREDIBILITY.regional,
    pacificFocused: true,
    active: true,
  },
  {
    slug: "rnz-pacific",
    name: "RNZ Pacific",
    kind: "media",
    homepage: "https://www.rnz.co.nz/news/pacific",
    feedUrl: "https://www.rnz.co.nz/rss/pacific.xml",
    feedType: "rss",
    baseCredibility: 80,
    pacificFocused: true,
    active: true,
  },
  {
    slug: "islands-business",
    name: "Islands Business",
    kind: "media",
    homepage: "https://islandsbusiness.com",
    feedUrl: "https://islandsbusiness.com/feed/",
    feedType: "rss",
    baseCredibility: DEFAULT_CREDIBILITY.media,
    pacificFocused: true,
    active: true,
  },
  {
    slug: "gdacs",
    name: "GDACS (Global Disaster Alert and Coordination System)",
    kind: "aggregator",
    homepage: "https://www.gdacs.org",
    feedUrl: "https://www.gdacs.org/xml/rss.xml",
    feedType: "rss",
    baseCredibility: 85,
    pacificFocused: false,
    active: true,
  },
  {
    slug: "lowy-interpreter",
    name: "The Interpreter (Lowy Institute)",
    kind: "research",
    homepage: "https://www.lowyinstitute.org/the-interpreter",
    feedUrl: "https://www.lowyinstitute.org/the-interpreter/rss.xml",
    feedType: "rss",
    baseCredibility: DEFAULT_CREDIBILITY.research,
    pacificFocused: false,
    active: true,
  },
  {
    slug: "aspi-strategist",
    name: "The Strategist (ASPI)",
    kind: "research",
    homepage: "https://www.aspistrategist.org.au",
    feedUrl: "https://www.aspistrategist.org.au/feed/",
    feedType: "rss",
    baseCredibility: DEFAULT_CREDIBILITY.research,
    pacificFocused: false,
    active: true,
  },
  {
    slug: "devpolicy",
    name: "Devpolicy Blog (ANU Development Policy Centre)",
    kind: "research",
    homepage: "https://devpolicy.org",
    feedUrl: "https://devpolicy.org/feed/",
    feedType: "rss",
    baseCredibility: DEFAULT_CREDIBILITY.research,
    pacificFocused: false,
    active: true,
  },
  {
    slug: "guardian-pacific",
    name: "The Guardian (Pacific Islands)",
    kind: "media",
    homepage: "https://www.theguardian.com/world/pacific-islands",
    feedUrl: "https://content.guardianapis.com/world/pacific-islands",
    feedType: "guardian",
    baseCredibility: 80,
    pacificFocused: true,
    // Needs GUARDIAN_API_KEY; the collector skips it while the key is unset
    active: true,
  },
];
