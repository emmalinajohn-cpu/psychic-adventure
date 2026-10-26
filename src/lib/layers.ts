// Map layers. The processor assigns each item to the layers it belongs on,
// using only what the item reports; the map draws approved items only.

export const MAP_LAYERS = {
  maritime_activity: { label: "Maritime activity", color: "#38bdf8" },
  military_exercise: { label: "Military exercises", color: "#f87171" },
  military_presence: { label: "Military bases & presence", color: "#fb923c" },
  diplomatic: { label: "Diplomatic missions & visits", color: "#a78bfa" },
  infrastructure: { label: "Strategic infrastructure", color: "#facc15" },
  disaster: { label: "Disasters & hazards", color: "#f472b6" },
  crime: { label: "Transnational crime & enforcement", color: "#fbbf24" },
  cyber: { label: "Cyber incidents", color: "#34d399" },
  political: { label: "Political & governance events", color: "#94a3b8" },
} as const;

export type MapLayer = keyof typeof MAP_LAYERS;
export const MAP_LAYER_KEYS = Object.keys(MAP_LAYERS) as [MapLayer, ...MapLayer[]];
