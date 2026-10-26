// Alerting rules from the platform specification. The model picks one category per
// item; the priority follows from the category, never from the model directly.

export const ALERT_CATEGORIES = {
  security_agreement: { priority: "high", label: "Security agreement" },
  political_instability: { priority: "high", label: "Political instability" },
  strategic_competition_event: { priority: "high", label: "Strategic competition event" },
  natural_disaster: { priority: "high", label: "Natural disaster" },
  regional_crisis: { priority: "high", label: "Regional crisis" },
  cyber_incident: { priority: "medium", label: "Cyber incident" },
  maritime_incident: { priority: "medium", label: "Maritime incident" },
  transnational_crime_incident: { priority: "medium", label: "Transnational crime incident" },
  policy_announcement: { priority: "medium", label: "Policy announcement" },
  government_decision: { priority: "medium", label: "Significant government decision" },
  commentary: { priority: "low", label: "Commentary" },
  routine_update: { priority: "low", label: "Routine update" },
  background_reporting: { priority: "low", label: "Background reporting" },
} as const;

export type AlertCategory = keyof typeof ALERT_CATEGORIES;
export type Priority = "high" | "medium" | "low";

export const ALERT_CATEGORY_KEYS = Object.keys(ALERT_CATEGORIES) as [AlertCategory, ...AlertCategory[]];

export function priorityFor(category: AlertCategory): Priority {
  return ALERT_CATEGORIES[category].priority;
}

const RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function maxPriority(a: Priority, b: Priority): Priority {
  return RANK[a] >= RANK[b] ? a : b;
}
