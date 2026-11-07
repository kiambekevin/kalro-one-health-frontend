/**
 * Pest & disease risk data layer.
 *
 * Backend contract (Django REST Framework, to be implemented):
 *   GET /api/v1/risk/?crop=<slug>&month=YYYY-MM[&pest=<slug>][&county=<name>]
 *   -> { count, results: CountyRisk[] }
 *
 * Until the API is live this module returns deterministic MOCK data so the map
 * is demonstrable. Nothing here is persisted. Swap `fetchRisk` for an HTTP call.
 */ 

export type RiskLevel = 0 | 1 | 2 | 3 | 4;

export const RISK_LEVELS: { level: RiskLevel; label: string; token: string; advice: string }[] = [
  { level: 0, label: "No risk", token: "var(--risk-none)", advice: "Routine monitoring." },
  { level: 1, label: "Low", token: "var(--risk-low)", advice: "Scout fields weekly." },
  { level: 2, label: "Moderate", token: "var(--risk-moderate)", advice: "Scout twice weekly; prepare control inputs." },
  { level: 3, label: "High", token: "var(--risk-high)", advice: "Apply recommended control within the action window." },
  { level: 4, label: "Very high", token: "var(--risk-severe)", advice: "Act immediately; alert extension officers." },
];

export type Pest = { slug: string; name: string; scientific: string; type: "Insect pest" | "Disease" };
export type Crop = { slug: string; name: string; pests: Pest[] };

export const CROPS: Crop[] = [
  {
    slug: "maize", name: "Maize", pests: [
      { slug: "faw", name: "Fall Armyworm", scientific: "Spodoptera frugiperda", type: "Insect pest" },
      { slug: "mln", name: "Maize Lethal Necrosis", scientific: "MCMV + SCMV", type: "Disease" },
      { slug: "stalk-borer", name: "Maize Stalk Borer", scientific: "Busseola fusca", type: "Insect pest" },
    ],
  },
  {
    slug: "beans", name: "Beans", pests: [
      { slug: "bsm", name: "Bean Stem Maggot", scientific: "Ophiomyia phaseoli", type: "Insect pest" },
      { slug: "als", name: "Angular Leaf Spot", scientific: "Pseudocercospora griseola", type: "Disease" },
      { slug: "bean-rust", name: "Bean Rust", scientific: "Uromyces appendiculatus", type: "Disease" },
      { slug: "aphids", name: "Black Bean Aphid", scientific: "Aphis fabae", type: "Insect pest" },
    ],
  },
  {
    slug: "potato", name: "Potato", pests: [
      { slug: "late-blight", name: "Late Blight", scientific: "Phytophthora infestans", type: "Disease" },
      { slug: "bacterial-wilt", name: "Bacterial Wilt", scientific: "Ralstonia solanacearum", type: "Disease" },
    ],
  },
  {
    slug: "tomato", name: "Tomato", pests: [
      { slug: "tuta", name: "Tomato Leafminer", scientific: "Tuta absoluta", type: "Insect pest" },
      { slug: "early-blight", name: "Early Blight", scientific: "Alternaria solani", type: "Disease" },
    ],
  },
  {
    slug: "wheat", name: "Wheat", pests: [
      { slug: "stem-rust", name: "Wheat Stem Rust", scientific: "Puccinia graminis (Ug99)", type: "Disease" },
      { slug: "rwa", name: "Russian Wheat Aphid", scientific: "Diuraphis noxia", type: "Insect pest" },
    ],
  },
  {
    slug: "coffee", name: "Coffee", pests: [
      { slug: "cbd", name: "Coffee Berry Disease", scientific: "Colletotrichum kahawae", type: "Disease" },
      { slug: "cbb", name: "Coffee Berry Borer", scientific: "Hypothenemus hampei", type: "Insect pest" },
    ],
  },
  {
    slug: "avocado", name: "Avocado", pests: [
      { slug: "fcm", name: "False Codling Moth", scientific: "Thaumatotibia leucotreta", type: "Insect pest" },
      { slug: "anthracnose", name: "Anthracnose", scientific: "Colletotrichum gloeosporioides", type: "Disease" },
    ],
  },
];

/** Counties where the crop is not meaningfully grown (shown as "No data"). */
const ARID = new Set(["Turkana", "Marsabit", "Mandera", "Wajir", "Garissa", "Isiolo", "Samburu", "Tana River"]);
const COAST = new Set(["Mombasa", "Kilifi", "Kwale", "Lamu", "Taita Taveta"]);
const HIGHLAND = new Set([
  "Nyandarua", "Nyeri", "Kiambu", "Murang'a", "Kirinyaga", "Meru", "Embu", "Nakuru", "Uasin Gishu",
  "Elgeyo-Marakwet", "Nandi", "Kericho", "Bomet", "Kisii", "Nyamira", "Trans Nzoia", "Narok", "Laikipia",
]);
const CROP_ZONES: Record<string, (c: string) => boolean> = {
  coffee: (c) => HIGHLAND.has(c) || ["Machakos", "Bungoma", "Kakamega", "Vihiga"].includes(c),
  wheat: (c) => ["Narok", "Nakuru", "Uasin Gishu", "Trans Nzoia", "Laikipia", "Nyandarua", "Meru", "Elgeyo-Marakwet", "Bomet"].includes(c),
  potato: (c) => HIGHLAND.has(c) || ["Bungoma", "Taita Taveta", "Baringo"].includes(c),
  avocado: (c) => !COAST.has(c) || c === "Taita Taveta",
};

export type PestRisk = {
  pest: Pest;
  level: RiskLevel;
  actionMidpoint: string; // ISO date
  actionWindow: { start: string; end: string };
};
export type CountyRisk = { county: string; grown: boolean; maxLevel: RiskLevel | null; pests: PestRisk[] };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Long rains (Mar–May) and short rains (Oct–Dec) raise pressure. */
function seasonBoost(month: number) {
  return [0, 0.2, 0.6, 1, 0.9, 0.5, 0.2, 0.1, 0.3, 0.7, 0.9, 0.7][month - 1] ?? 0;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function computeRisk(county: string, crop: Crop, month: string): CountyRisk {
  const grownFn = CROP_ZONES[crop.slug];
  const grown = !ARID.has(county) && (grownFn ? grownFn(county) : true);
  if (!grown) return { county, grown, maxLevel: null, pests: [] };
  const [y = 2026, m = 1] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pests = crop.pests.map((pest) => {
    const r = hash(`${county}|${pest.slug}|${month}`);
    const base = hash(`${county}|${pest.slug}`);
    const score = 0.55 * r + 0.25 * base + 0.3 * seasonBoost(m);
    const level = Math.max(0, Math.min(4, Math.floor(score * 4.4 - 0.3))) as RiskLevel;
    // Higher risk -> earlier midpoint and wider window
    const midDay = Math.max(2, Math.round(daysInMonth * (0.85 - level * 0.15 + r * 0.2)));
    const mid = new Date(Date.UTC(y, m - 1, Math.min(midDay, daysInMonth)));
    const half = 3 + level * 2;
    const start = new Date(mid); start.setUTCDate(mid.getUTCDate() - half);
    const end = new Date(mid); end.setUTCDate(mid.getUTCDate() + half);
    return { pest, level, actionMidpoint: iso(mid), actionWindow: { start: iso(start), end: iso(end) } };
  });
  const maxLevel = Math.max(...pests.map((p) => p.level)) as RiskLevel;
  return { county, grown, maxLevel, pests: pests.sort((a, b) => b.level - a.level) };
}

export function monthOptions(year = 2026) {
  return Array.from({ length: 12 }, (_, i) => {
    const value = `${year}-${String(i + 1).padStart(2, "0")}`;
    const label = new Date(Date.UTC(year, i, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    return { value, label };
  });
}

export function formatDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
