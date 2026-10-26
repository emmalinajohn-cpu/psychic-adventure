// Fixed reference facts: the 22 Pacific Island Countries and Territories that are
// members of the Pacific Community (SPC), and the platform's eight security themes.

export type Subregion = "Melanesia" | "Micronesia" | "Polynesia";

export interface Country {
  iso2: string;
  name: string;
  subregion: Subregion;
  capital: string;
  lat: number;
  lon: number;
  aliases: string[];
}

export const COUNTRIES: Country[] = [
  { iso2: "AS", name: "American Samoa", subregion: "Polynesia", capital: "Pago Pago", lat: -14.28, lon: -170.7, aliases: ["Pago Pago", "Tutuila"] },
  { iso2: "CK", name: "Cook Islands", subregion: "Polynesia", capital: "Avarua", lat: -21.21, lon: -159.78, aliases: ["Rarotonga", "Aitutaki", "Avarua"] },
  { iso2: "FM", name: "Federated States of Micronesia", subregion: "Micronesia", capital: "Palikir", lat: 6.92, lon: 158.16, aliases: ["FSM", "Micronesia", "Pohnpei", "Chuuk", "Yap", "Kosrae", "Palikir"] },
  { iso2: "FJ", name: "Fiji", subregion: "Melanesia", capital: "Suva", lat: -18.14, lon: 178.44, aliases: ["Suva", "Nadi", "Lautoka", "Fijian"] },
  { iso2: "PF", name: "French Polynesia", subregion: "Polynesia", capital: "Papeete", lat: -17.54, lon: -149.57, aliases: ["Tahiti", "Papeete", "Polynésie française", "Nuku Hiva", "Marquesas"] },
  { iso2: "GU", name: "Guam", subregion: "Micronesia", capital: "Hagåtña", lat: 13.47, lon: 144.75, aliases: ["Hagatna", "Hagåtña", "Guåhan"] },
  { iso2: "KI", name: "Kiribati", subregion: "Micronesia", capital: "South Tarawa", lat: 1.33, lon: 172.98, aliases: ["Tarawa", "I-Kiribati", "Kiritimati"] },
  { iso2: "MH", name: "Marshall Islands", subregion: "Micronesia", capital: "Majuro", lat: 7.09, lon: 171.38, aliases: ["Majuro", "Kwajalein", "RMI", "Marshallese"] },
  { iso2: "NR", name: "Nauru", subregion: "Micronesia", capital: "Yaren", lat: -0.55, lon: 166.92, aliases: ["Nauruan", "Yaren"] },
  { iso2: "NC", name: "New Caledonia", subregion: "Melanesia", capital: "Nouméa", lat: -22.27, lon: 166.46, aliases: ["Noumea", "Nouméa", "Kanaky", "Nouvelle-Calédonie"] },
  { iso2: "NU", name: "Niue", subregion: "Polynesia", capital: "Alofi", lat: -19.06, lon: -169.92, aliases: ["Niuean", "Alofi"] },
  { iso2: "MP", name: "Northern Mariana Islands", subregion: "Micronesia", capital: "Saipan", lat: 15.18, lon: 145.75, aliases: ["Saipan", "Tinian", "Rota", "CNMI"] },
  { iso2: "PW", name: "Palau", subregion: "Micronesia", capital: "Ngerulmud", lat: 7.5, lon: 134.62, aliases: ["Palauan", "Koror", "Ngerulmud", "Babeldaob"] },
  { iso2: "PG", name: "Papua New Guinea", subregion: "Melanesia", capital: "Port Moresby", lat: -9.44, lon: 147.18, aliases: ["PNG", "Port Moresby", "Bougainville", "Lae", "Papua New Guinean"] },
  { iso2: "PN", name: "Pitcairn Islands", subregion: "Polynesia", capital: "Adamstown", lat: -25.07, lon: -130.1, aliases: ["Pitcairn", "Adamstown"] },
  { iso2: "WS", name: "Samoa", subregion: "Polynesia", capital: "Apia", lat: -13.83, lon: -171.76, aliases: ["Apia", "Samoan", "Savai'i", "Upolu"] },
  { iso2: "SB", name: "Solomon Islands", subregion: "Melanesia", capital: "Honiara", lat: -9.43, lon: 159.95, aliases: ["Honiara", "Solomons", "Malaita", "Guadalcanal"] },
  { iso2: "TK", name: "Tokelau", subregion: "Polynesia", capital: "Rotating (Atafu, Fakaofo, Nukunonu)", lat: -9.2, lon: -171.85, aliases: ["Atafu", "Fakaofo", "Nukunonu"] },
  { iso2: "TO", name: "Tonga", subregion: "Polynesia", capital: "Nukuʻalofa", lat: -21.14, lon: -175.2, aliases: ["Nuku'alofa", "Nukualofa", "Tongan", "Vava'u"] },
  { iso2: "TV", name: "Tuvalu", subregion: "Polynesia", capital: "Funafuti", lat: -8.52, lon: 179.2, aliases: ["Funafuti", "Tuvaluan"] },
  { iso2: "VU", name: "Vanuatu", subregion: "Melanesia", capital: "Port Vila", lat: -17.73, lon: 168.32, aliases: ["Port Vila", "Efate", "Espiritu Santo", "Ni-Vanuatu"] },
  { iso2: "WF", name: "Wallis and Futuna", subregion: "Polynesia", capital: "Mata-Utu", lat: -13.28, lon: -176.17, aliases: ["Wallis", "Futuna", "Mata-Utu", "Uvea"] },
];

export const COUNTRY_BY_ISO = new Map(COUNTRIES.map((c) => [c.iso2, c]));

export interface Theme {
  slug: string;
  name: string;
}

export const THEMES: Theme[] = [
  { slug: "climate-security", name: "Climate Security" },
  { slug: "maritime-security", name: "Maritime Security" },
  { slug: "cyber-security", name: "Cyber Security" },
  { slug: "human-security", name: "Human Security" },
  { slug: "economic-security", name: "Economic Security" },
  { slug: "strategic-competition", name: "Strategic Competition" },
  { slug: "governance-stability", name: "Governance & Stability" },
  { slug: "transnational-crime", name: "Transnational Crime" },
];

export const THEME_SLUGS = THEMES.map((t) => t.slug) as [string, ...string[]];
export const THEME_BY_SLUG = new Map(THEMES.map((t) => [t.slug, t]));
