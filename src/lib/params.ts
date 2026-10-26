import { COUNTRY_BY_ISO, THEME_BY_SLUG } from "./reference";
import type { FeedFilter } from "./queries";

/** Turn untrusted query-string values into a validated feed filter. */
export function feedFilter(p: Record<string, string | string[] | undefined>): FeedFilter {
  const one = (k: string) => (typeof p[k] === "string" && p[k] ? (p[k] as string) : undefined);
  const country = one("country")?.toUpperCase();
  const theme = one("theme");
  const priority = one("priority");
  return {
    country: country && COUNTRY_BY_ISO.has(country) ? country : undefined,
    theme: theme && THEME_BY_SLUG.has(theme) ? theme : undefined,
    priority: priority === "high" || priority === "medium" || priority === "low" ? priority : undefined,
    q: one("q")?.slice(0, 200),
  };
}
