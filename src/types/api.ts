/** TypeScript interfaces mirroring the Django REST Framework API (see docs/API_CONTRACT.md). */

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type Domain = "plant" | "livestock";
export type Severity = "low" | "medium" | "high";
export type ContentStatus =
  | "draft" | "submitted" | "under_review" | "approved" | "published" | "returned" | "archived";

export type RoleCode =
  | "system_admin" | "researcher" | "plant_health_expert" | "animal_health_expert"
  | "repository_manager" | "field_reporter" | "county_officer" | "verification_officer"
  | "alert_issuer" | "data_analyst" | "public";

export type User = {
  id: number; username: string; email: string; full_name: string;
  institution?: string; county?: string; roles: RoleCode[]; permissions: string[]; is_active: boolean;
};

export type Crop = { id: number; slug: string; name: string; scientific_name: string; group: string; image?: string };
export type AnimalSpecies = { id: number; slug: string; name: string; group: string };

export type ImageType = "adult" | "larva" | "eggs" | "symptom" | "damage" | "control";
export type PestImage = { id: number; url: string; caption: string; type: ImageType };

export type PlantCategory =
  | "invertebrate_pest" | "plant_disease" | "vertebrate_pest" | "weed"
  | "invasive_species" | "abiotic" | "post_harvest";
export type LivestockCategory =
  | "viral" | "bacterial" | "parasitic" | "fungal" | "vector_borne" | "nutritional" | "other_animal";
export type Category = PlantCategory | LivestockCategory;

export type PestDisease = {
  id: number; slug: string; domain: Domain;
  common_name: string; scientific_name: string; local_names: string[];
  category: Category; issue_type: string; severity: Severity; emerging_threat: boolean;
  hosts: string[]; // crop or animal slugs
  summary: string; description: string;
  symptoms: string[]; stages?: string[];
  damage: { direct: string; indirect: string };
  economic_impact: string; yield_loss_range?: string;
  vector?: string;
  distribution_counties: string[]; seasonal_occurrence: string; favourable_conditions: string;
  prevention: string[];
  images: PestImage[];
  references: { title: string; source: string; year?: number; url?: string }[];
  status: ContentStatus; updated_at: string;
};

export type PracticeType = "preventive" | "cultural" | "biological" | "physical" | "chemical" | "ipm";
export type ManagementPractice = {
  id: number; name: string; type: PracticeType; description: string;
  target_slugs: string[]; applicable_hosts: string[];
  application_method: string; timing: string; frequency: string;
  effectiveness?: string; estimated_cost?: string; safety: string;
  /** Chemical practices: active ingredient only, never trade names. */
  active_ingredient?: string; registration_reference?: string;
  source: string; last_reviewed: string;
};

export type ResourceType =
  | "publication" | "technical_report" | "manual" | "factsheet" | "extension_material"
  | "poster" | "image" | "identification_guide" | "surveillance_report";
export type RepositoryResource = {
  id: number; title: string; type: ResourceType; abstract: string; authors: string[];
  institution: string; year: number; publisher: string; subject: string; keywords: string[];
  hosts: string[]; pest_slugs: string[]; counties: string[]; value_chain: string; language: string;
  doi?: string; file_format: string; file_size: string; access: "public" | "restricted"; licence: string;
  uploaded_at: string; modified_at: string; owner: string; status: ContentStatus;
  versions: { version: string; date: string; by: string; note: string }[];
};

export type ReportStatus = "draft" | "submitted" | "under_review" | "info_requested" | "verified" | "rejected" | "closed";
export type FieldReport = {
  id: number; reference: string; domain: Domain; host: string; suspected_pest: string;
  symptoms: string; description: string; date_observed: string;
  county: string; sub_county: string; ward: string; location: string; gps?: { lat: number; lng: number };
  affected_extent: string; severity: Severity; reporter: string; status: ReportStatus;
  history: { at: string; by: string; action: string; note?: string }[];
  created_at: string;
};

export type AlertLevel = "information" | "warning" | "critical";
export type EarlyWarningAlert = {
  id: number; title: string; level: AlertLevel; pest_slug: string; pest_name: string;
  counties: string[]; start_date: string; expiry_date: string;
  summary: string; recommended_actions: string[]; issued_by: string;
  status: "proposed" | "approved" | "published" | "withdrawn" | "expired";
};

export type AuditLog = {
  id: number; at: string; user: string; action: string; record: string;
  previous?: string; next?: string; note?: string;
};
