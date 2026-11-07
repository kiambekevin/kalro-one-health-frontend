export type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ApiImage = {
  id: number;
  image?: string | null;
  image_file?: string | null;
  caption?: string;
  alt_text?: string;
  description?: string;
  image_type?: string;
  pest_disease_ref?: string;
  stage?: string;
  manifestation_context?: string;
  source?: string;
  credit?: string;
  license?: string;
};

export type PestDisease = {
  id: number;
  code: string;
  name: string;
  crop_name?: string;
  species_name?: string;
  category_name?: string;
  agent_type_name?: string;
  damage_type_name?: string;
  economic_impact?: string;
  economic_impact_display?: string;
  severity?: string;
  severity_display?: string;
  images_count?: number;
  hotspots_counties_count?: number;
  is_emerging?: boolean;
  is_vector?: boolean;
  zoonotic?: boolean;
  notifiable?: boolean;
  images_detail?: ApiImage[];
  crop_detail?: { name: string; scientific_name?: string };
  species_detail?: { name: string; scientific_name?: string };
  category_detail?: { name: string };
  agent_type_detail?: { name: string };
  damage_type_detail?: { name: string };
  causative_agent?: string;
  economic_importance?: string;
  symptoms?: string;
  clinical_signs?: string;
  cultural_control?: string;
  biological_control?: string;
  chemical_control?: string;
  control?: string;
  diagnosis?: string;
  vaccination_available?: boolean;
  vaccination_notes?: string;
  yield_loss_percentage_min?: number | null;
  yield_loss_percentage_max?: number | null;
  east_africa_distribution?: string;
  africa_distribution?: string;
  global_distribution?: string;
  seasonal_pattern_display?: string;
  seasonal_pattern?: string;
  life_cycle_days?: number | null;
  vector_for?: string;
  hotspots_counties_in_kenya_detail?: { id: number; name: string }[];
  susceptible_varieties_detail?: { id: number; name: string }[];
  susceptible_breeds_detail?: { id: number; name: string }[];
  transmission_routes_detail?: { id: number; name: string }[];
  treatment_classes_detail?: {
    id: number;
    name: string;
    route?: string;
    withdrawal_period_meat?: number | null;
    withdrawal_period_milk?: number | null;
  }[];
  synonyms?: string;
  incubation_period?: string;
  woah_code?: string;
};

export type ValueChain = {
  id: number;
  name: string;
  slug?: string;
  scientific_name?: string;
  category_detail?: { name: string } | null;
  images_detail?: ApiImage[];
};

export type LibraryResource = {
  id: number;
  title: string;
  resource_type?: string;
  pest_disease_ref?: string;
  crop_pest_disease?: string | null;
  livestock_pest_disease?: string | null;
  language?: string;
  format?: string;
  url_or_file?: string;
  author?: string;
  year?: number | null;
  access_level?: string;
};

const apiRoot = (import.meta.env["VITE_API_BASE_URL"] || "/api").replace(/\/$/, "");

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path === apiRoot || path.startsWith(`${apiRoot}/`)) {
    const origin = /^https?:\/\//i.test(apiRoot) ? apiRoot : window.location.origin;
    return new URL(path, origin).toString();
  }
  if (path.startsWith("/media/")) {
    const origin = /^https?:\/\//i.test(apiRoot) ? apiRoot : window.location.origin;
    return new URL(path, origin).toString();
  }
  const root = `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
  return /^https?:\/\//i.test(root) ? new URL(root).toString() : new URL(root, window.location.origin).toString();
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>) {
  const url = new URL(apiUrl(path));
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export async function apiList<T>(path: string, params?: Record<string, string | number | undefined>) {
  const result = await apiGet<ApiPage<T> | T[]>(path, params);
  return Array.isArray(result) ? result : result.results;
}

export function imageUrl(image?: string | null) {
  if (!image) return undefined;
  return /^https?:\/\//i.test(image) ? image : apiUrl(image);
}