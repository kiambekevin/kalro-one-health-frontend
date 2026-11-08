import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  ChevronRight,
  ClipboardList,
  CloudOff,
  Compass,
  LocateFixed,
  MapPin,
  PawPrint,
  Plus,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Sprout,
  Stethoscope,
  X,
} from "lucide-react";
import { apiGet, apiList, type ApiPage, type PestDisease, type ValueChain } from "@/lib/api";
import {
  readLocalDrafts,
  saveLocalDraft,
  saveAdvisory,
  submitSurveillanceReport,
} from "@/lib/field-workflows";

type HealthArea = "crop" | "livestock";
type ProfileSummary = PestDisease & { crop_name?: string; species_name?: string };
type DiagnosticSearch = {
  results?: {
    crop_pest_diseases?: ProfileSummary[];
    livestock_pest_diseases?: ProfileSummary[];
    nutrient_deficiencies?: {
      id: number;
      nutrient: string;
      crop_name?: string;
      symptom?: string;
      correction_measure?: string;
    }[];
  };
};
type ScoutDraft = {
  localId: string;
  cropId: string;
  cropName: string;
  profileId: string;
  profileName: string;
  observation: string;
  observedAt: string;
  latitude?: number;
  longitude?: number;
  photoDataUrl?: string;
  status: "local draft";
};

const panel = "rounded-2xl border border-border bg-card p-5 shadow-sm";
const labelClass = "block text-sm font-semibold text-foreground";
const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function PageIntro({
  eyebrow,
  title,
  description,
  back = "/",
}: {
  eyebrow: string;
  title: string;
  description: string;
  back?: string;
}) {
  return (
    <header className="border-b border-border bg-secondary/60">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
        <a
          href={back}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </a>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-primary-deep sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}

function readImage(file: File, maxBytes = 4 * 1024 * 1024) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
    if (file.size > maxBytes)
      return reject(new Error("Image is too large for a local draft (maximum 4 MB)."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function resultList<T>(response: ApiPage<T> | T[]): T[] {
  return Array.isArray(response) ? response : response.results;
}

export function AIDiagnosticPage() {
  const [area, setArea] = useState<HealthArea>("crop");
  const [crops, setCrops] = useState<ValueChain[]>([]);
  const [cropId, setCropId] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [location, setLocation] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const path = area === "crop" ? "/crops/crops/" : "/livestock/species/";
    apiList<ValueChain>(path, { is_active: "true" })
      .then((items) => active && setCrops(items))
      .catch(() => active && setCrops([]));
    setCropId("");
    return () => {
      active = false;
    };
  }, [area]);

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      setImageData(await readImage(file));
      setImageName(file.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to read image.");
    }
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageData) {
      setError("Add a photo before continuing.");
      return;
    }
    if (symptoms.trim().length < 2) {
      setError(
        "Add at least two characters describing the symptoms so we can search the existing diagnostic records.",
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: symptoms.trim(),
        scope: area === "crop" ? "crop" : "livestock",
      });
      const matches = await apiGet<DiagnosticSearch>(`/diagnostics/search/?${params.toString()}`);
      sessionStorage.setItem(
        "kalro-diagnostic-result",
        JSON.stringify({
          imageData,
          imageName,
          cropId,
          cropName: crops.find((crop) => String(crop.id) === cropId)?.name || "",
          location,
          symptoms,
          area,
          matches,
        }),
      );
      window.location.assign("/ai-diagnostic/results");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The diagnostic search is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <PageIntro
        eyebrow="Plant health assistant"
        title="AI Diagnostic *Test version"
        description="Add a crop image and symptom notes to search existing KALRO diagnostic records. Image recognition is not available in this deployment; results will not include an AI prediction."
      />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={analyze}
          className={`${panel} space-y-5`}
          aria-label="Image-assisted diagnostic lookup"
        >
          <div
            className="grid grid-cols-2 rounded-xl bg-muted p-1"
            role="group"
            aria-label="Health area"
          >
            {(["crop", "livestock"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setArea(value)}
                aria-pressed={area === value}
                className={`rounded-lg py-2.5 text-sm font-semibold ${area === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {value === "crop" ? "Crop" : "Livestock"}
              </button>
            ))}
          </div>
          <label className={labelClass}>
            {area === "crop" ? "Crop" : "Species"}
            <select
              value={cropId}
              onChange={(event) => setCropId(event.target.value)}
              className={inputClass}
            >
              <option value="">Select {area === "crop" ? "a crop" : "a species"} (optional)</option>
              {crops.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <section>
            <h2 className="text-sm font-bold">Affected plant or animal photo</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, WebP · up to 4 MB · kept only in this browser session
            </p>
            {imageData ? (
              <div className="relative mt-3 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={imageData}
                  alt="Selected diagnostic"
                  className="max-h-80 w-full object-contain"
                />
                <div className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate">{imageName}</span>
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => {
                      setImageData("");
                      setImageName("");
                    }}
                    className="ml-2 rounded-full p-2 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="mt-3 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 p-6 text-center hover:border-primary">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                  <Camera className="h-6 w-6" />
                </span>
                <span className="mt-3 font-semibold">Add or take a photo</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Choose a photo from your device camera or gallery
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={chooseImage}
                  className="sr-only"
                />
              </label>
            )}
          </section>
          <label className={labelClass}>
            Symptoms or issue terms
            <textarea
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Describe visible symptoms, affected parts, or suspected pest/disease"
              className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className={labelClass}>
            Location (optional)
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="County, area or GPS coordinates"
              className={inputClass}
            />
          </label>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Searching records…
              </>
            ) : (
              <>
                <Stethoscope className="h-4 w-4" /> Analyze image & search records
              </>
            )}
          </button>
        </form>
        <aside className="space-y-4">
          <div className={panel}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="font-display font-bold">Image inference unavailable</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              There is no image-classification model or inference API configured in this project.
              The photo is previewed only. This feature searches the existing text-based diagnostic
              endpoint using your symptom notes; it does not calculate predictions or confidence
              scores.
            </p>
          </div>
          <div className={panel}>
            <h2 className="font-display font-bold">What happens next?</h2>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li>1. Describe symptoms and add a reference photo.</li>
              <li>2. We query KALRO’s existing symptom/profile search.</li>
              <li>3. Review related profiles and management guidance.</li>
              <li>4. Verify uncertain cases with an extension officer.</li>
            </ol>
            <a
              href="/ipm-guides"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary"
            >
              Browse IPM resources <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}

type DiagnosticState = {
  imageData: string;
  imageName: string;
  cropId: string;
  cropName: string;
  location: string;
  symptoms: string;
  area: HealthArea;
  matches: DiagnosticSearch;
};

export function DiagnosticResultsPage() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticState | null>(null);
  useEffect(() => {
    try {
      setDiagnostic(
        JSON.parse(
          sessionStorage.getItem("kalro-diagnostic-result") || "null",
        ) as DiagnosticState | null,
      );
    } catch {
      setDiagnostic(null);
    }
  }, []);
  const cropResults = diagnostic?.matches.results?.crop_pest_diseases || [];
  const livestockResults = diagnostic?.matches.results?.livestock_pest_diseases || [];
  const deficiencies = diagnostic?.matches.results?.nutrient_deficiencies || [];

  if (!diagnostic)
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <Stethoscope className="h-12 w-12 text-primary/50" />
        <h1 className="mt-4 font-display text-2xl font-bold">No diagnostic session found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with an image and symptom description to view the record search.
        </p>
        <a
          href="/ai-diagnostic"
          className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Start diagnostic lookup
        </a>
      </div>
    );

  return (
    <div className="min-h-[70vh] bg-background">
      <PageIntro
        eyebrow="Diagnostic results"
        title="Related KALRO records"
        description="These are text-search matches for your symptom notes, not an image-based AI diagnosis."
        back="/ai-diagnostic"
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1fr]">
          <section className={panel}>
            <h2 className="font-display font-bold">Submitted photo</h2>
            <img
              src={diagnostic.imageData}
              alt={diagnostic.imageName || "Uploaded diagnostic image"}
              className="mt-3 max-h-[440px] w-full rounded-xl bg-muted object-contain"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {diagnostic.imageName} ·{" "}
              {diagnostic.cropName ||
                (diagnostic.area === "crop" ? "Crop not selected" : "Species not selected")}{" "}
              {diagnostic.location && `· ${diagnostic.location}`}
            </p>
          </section>
          <section className="space-y-4">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
              <p className="font-bold">No AI prediction was generated</p>
              <p className="mt-1 text-sm leading-6">
                The image model is not configured. No predicted pest/disease or confidence score is
                available. Verify suspected issues with an agricultural expert.
              </p>
            </div>
            <div className={panel}>
              <h2 className="font-display font-bold">Search terms</h2>
              <p className="mt-2 text-sm text-muted-foreground">{diagnostic.symptoms}</p>
            </div>
          </section>
        </div>
        <section>
          <h2 className="mb-4 font-display text-xl font-bold text-primary-deep">Related records</h2>
          {!cropResults.length && !livestockResults.length && !deficiencies.length ? (
            <div className={`${panel} text-center text-sm text-muted-foreground`}>
              No matching records were returned. Try more specific symptom terms.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cropResults.map((item) => (
                <a
                  key={`crop-${item.id}`}
                  href={`/pest-disease/crop/${item.id}`}
                  className={`${panel} block hover:border-primary`}
                >
                  <span className="text-xs font-bold uppercase text-primary">
                    Crop · {item.crop_name}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold">{item.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {item.category_name || item.agent_type_name || "KALRO profile"}
                  </p>
                </a>
              ))}
              {livestockResults.map((item) => (
                <a
                  key={`livestock-${item.id}`}
                  href={`/pest-disease/livestock/${item.id}`}
                  className={`${panel} block hover:border-primary`}
                >
                  <span className="text-xs font-bold uppercase text-primary">
                    Livestock · {item.species_name}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold">{item.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.category_name || item.agent_type_name || "KALRO profile"}
                  </p>
                </a>
              ))}
              {deficiencies.map((item) => (
                <article key={`deficiency-${item.id}`} className={panel}>
                  <span className="text-xs font-bold uppercase text-primary">
                    Nutrient deficiency · {item.crop_name}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold">{item.nutrient}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.symptom}</p>
                  {item.correction_measure && (
                    <p className="mt-2 text-sm">
                      <strong>Correction:</strong> {item.correction_measure}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-wrap gap-3">
          <a
            href="/ai-diagnostic"
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold"
          >
            New lookup
          </a>
          <a
            href="/ipm-guides"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Find IPM resources
          </a>
        </div>
      </main>
    </div>
  );
}

type Advisory = {
  id: string | number;
  title: string;
  summary?: string;
  advisory_type?: string;
  severity?: string;
  counties?: string[];
  issued_at?: string;
  expires_at?: string;
  status?: string;
  recommended_actions?: string[];
};

function AdvisoryComposer() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [type, setType] = useState("Pest outbreak");
  const [severity, setSeverity] = useState("Moderate");
  const [counties, setCounties] = useState("");
  const [actions, setActions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const configured = Boolean(import.meta.env["VITE_ADVISORY_API_PATH"]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await saveAdvisory({
        title,
        summary,
        advisory_type: type,
        severity,
        counties: counties
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
        recommended_actions: actions
          .split("\\n")
          .map((line) => line.trim())
          .filter(Boolean),
        expires_at: expiresAt,
        status: "published",
      });
      setMessage(
        result.accepted
          ? `The advisory service accepted the request${result.reference ? ` (${result.reference})` : ""}.`
          : "The advisory service did not confirm acceptance.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Advisory was not published.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={panel}>
      <summary className="cursor-pointer list-none font-display font-bold text-primary-deep">
        Authorized administrator · Create / publish advisory
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Server-side authentication and authorization must approve publishing. This form does not
        create local or mock advisories.
      </p>
      {!configured && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          Publishing endpoint is not configured. Set VITE_ADVISORY_API_PATH to an authorized
          endpoint before enabling this form.
        </p>
      )}
      <form onSubmit={publish} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
            disabled={!configured || saving}
          />
        </label>
        <label className={labelClass}>
          Alert type
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass}
            disabled={!configured || saving}
          >
            <option>Pest outbreak</option>
            <option>Disease</option>
            <option>Weather warning</option>
            <option>Agricultural advisory</option>
          </select>
        </label>
        <label className={labelClass}>
          Severity
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className={inputClass}
            disabled={!configured || saving}
          >
            {["Low", "Moderate", "High", "Critical"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Expiry
          <input
            required
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className={inputClass}
            disabled={!configured || saving}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Affected counties / regions (comma separated)
          <input
            value={counties}
            onChange={(event) => setCounties(event.target.value)}
            className={inputClass}
            disabled={!configured || saving}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Summary
          <textarea
            required
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"
            disabled={!configured || saving}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Recommended actions (one per line)
          <textarea
            value={actions}
            onChange={(event) => setActions(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"
            disabled={!configured || saving}
          />
        </label>
        {error && (
          <p
            className="sm:col-span-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p className="sm:col-span-2 rounded-lg bg-secondary p-3 text-sm" role="status">
            {message}
          </p>
        )}
        <button
          disabled={!configured || saving}
          className="h-11 rounded-lg bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2"
        >
          {saving ? "Sending to advisory service…" : "Submit for authorized publishing"}
        </button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        Edit/archive operations and notification delivery require server endpoints. The frontend
        will not claim an alert was published or sent without a successful server response.
      </p>
    </details>
  );
}

export function EarlyAdvisoryPage() {
  const [items, setItems] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [error, setError] = useState("");
  const endpoint = import.meta.env["VITE_ADVISORIES_API_PATH"];
  useEffect(() => {
    let active = true;
    if (!endpoint) {
      setLoading(false);
      return;
    }
    apiGet<ApiPage<Advisory> | Advisory[]>(endpoint)
      .then((response) => active && setItems(resultList(response)))
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Advisories could not be loaded."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [endpoint]);
  const shown = items.filter(
    (item) =>
      (!severity || item.severity?.toLowerCase() === severity.toLowerCase()) &&
      (!query ||
        `${item.title} ${item.summary || ""} ${(item.counties || []).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const high = items.filter(
    (item) =>
      ["high", "critical", "severe"].includes((item.severity || "").toLowerCase()) &&
      item.status?.toLowerCase() === "published",
  ).length;

  return (
    <div className="min-h-[70vh] bg-background">
      <PageIntro
        eyebrow="Agricultural situation board"
        title="Early Warning & Advisories"
        description="Current alerts and historical bulletins will appear here when an authorized advisory service is connected."
        back="/"
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
              High / critical active
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-950">{endpoint ? high : "—"}</p>
          </div>
          <div className={panel}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Current bulletins
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary-deep">
              {endpoint
                ? items.filter((item) => item.status?.toLowerCase() === "published").length
                : "—"}
            </p>
          </div>
          <div className={panel}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Historical advisories
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary-deep">
              {endpoint
                ? items.filter((item) => item.status?.toLowerCase() === "archived").length
                : "—"}
            </p>
          </div>
        </section>
        {!endpoint && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Advisory API not configured.</strong> The current Django project has no
            bulletin/advisory model or endpoint, so this page will not invent alerts, dates,
            locations or delivery status. Configure{" "}
            <span className="font-semibold">VITE_ADVISORIES_API_PATH</span> to an authorized API
            response to display bulletins. Administrator publishing and notifications require
            corresponding authenticated server services.
          </div>
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <section className={panel}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-xl font-bold text-primary-deep">Bulletin board</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search advisories by title, summary or affected county.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="sr-only" htmlFor="advisory-search">
                Search advisories
              </label>
              <input
                id="advisory-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search advisories"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <label className="sr-only" htmlFor="advisory-severity">
                Severity
              </label>
              <select
                id="advisory-severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All severity levels</option>
                {["Low", "Moderate", "High", "Critical"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : shown.length ? (
            <div className="mt-5 space-y-3">
              {shown.map((item) => (
                <article key={item.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {item.advisory_type || "Advisory"}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                          {item.severity || "Severity not specified"}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                          {item.status || "Status unavailable"}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-bold">{item.title}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.issued_at || "Issue date unavailable"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                  {item.counties?.length ? (
                    <p className="mt-3 text-sm">
                      <MapPin className="mr-1 inline h-4 w-4 text-primary" />
                      {item.counties.join(", ")}
                    </p>
                  ) : null}
                  {item.recommended_actions?.length ? (
                    <ul className="mt-3 list-inside list-disc text-sm">
                      {item.recommended_actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Valid until {item.expires_at || "not specified"}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border p-12 text-center">
              <Bell className="mx-auto h-9 w-9 text-primary/50" />
              <h3 className="mt-3 font-bold">
                {endpoint
                  ? "No advisories match these filters"
                  : "No published advisories available"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {endpoint
                  ? "Try adjusting your search."
                  : "Connect the advisory service to load current and historical bulletins."}
              </p>
            </div>
          )}
        </section>
        <AdvisoryComposer />
        <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}>
          <div>
            <h2 className="font-display font-bold">Distribution and response</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use backend profile distribution and submit field observations through the reporting
              tools.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/pest-risk"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Pest risk map
            </a>
            <a
              href="/surveillance"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Submit observation
            </a>
          </div>
        </section>
        <p className="text-xs text-muted-foreground">
          No email/SMS/in-app delivery is claimed. Notification providers must be configured on an
          authorized service before messages can be sent.
        </p>
      </main>
    </div>
  );
}

export function SurveillancePage() {
  const [area, setArea] = useState<HealthArea>("crop");
  const [hosts, setHosts] = useState<ValueChain[]>([]);
  const [hostId, setHostId] = useState("");
  const [issues, setIssues] = useState<ProfileSummary[]>([]);
  const [issueId, setIssueId] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [observed, setObserved] = useState(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState("Medium");
  const [areaAffected, setAreaAffected] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const endpoint = area === "crop" ? "/crops/crops/" : "/livestock/species/";
    apiList<ValueChain>(endpoint, { is_active: "true" })
      .then((items) => active && setHosts(items))
      .catch(() => active && setHosts([]));
    setHostId("");
    setIssues([]);
    setIssueId("");
    return () => {
      active = false;
    };
  }, [area]);
  useEffect(() => {
    if (!hostId) {
      setIssues([]);
      setIssueId("");
      return;
    }
    let active = true;
    const root = area === "crop" ? "/crops" : "/livestock";
    const filter = area === "crop" ? { crop: hostId } : { species: hostId };
    apiList<ProfileSummary>(`${root}/pests-diseases/`, filter)
      .then((items) => active && setIssues(items))
      .catch(() => active && setIssues([]));
    return () => {
      active = false;
    };
  }, [area, hostId]);

  async function useLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocation(
          `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        );
        setError("");
      },
      () => setError("Location permission was not granted."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  async function saveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    const host = hosts.find((item) => String(item.id) === hostId);
    const issue = issues.find((item) => String(item.id) === issueId);
    const localId = makeId();
    const payload = {
      localId,
      area,
      cropId: hostId,
      cropName: host?.name || "",
      profileId: issueId,
      profileName: issue?.name || "",
      symptoms,
      location,
      coordinates: coords,
      observed,
      severity,
      affectedArea: areaAffected,
      photoName,
      photoDataUrl: photo,
    };
    setSending(true);
    try {
      const result = await submitSurveillanceReport(payload);
      setStatus(
        `Server accepted report ${result.reference || ""}. Current status: ${result.status || "received"}.`,
      );
    } catch (reason) {
      try {
        saveLocalDraft("kalro-surveillance-drafts", { ...payload, status: "local draft" });
        setStatus(
          "Saved as a local draft only. It has not been submitted to the server or reviewed.",
        );
        setError(
          reason instanceof Error ? reason.message : "No surveillance service is configured.",
        );
      } catch {
        setError(
          "The reporting service is unavailable and this browser could not save the draft. No report was submitted.",
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <PageIntro
        eyebrow="Field reporting"
        title="Submit Surveillance"
        description="Record observed crop or livestock health issues. This project has no surveillance-report API yet; until one is configured, submissions are saved as local drafts only."
      />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <form onSubmit={saveReport} className={`${panel} space-y-5`}>
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
            {(["crop", "livestock"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setArea(value)}
                aria-pressed={area === value}
                className={`rounded-md py-2 text-sm font-semibold ${area === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {value === "crop" ? "Crop" : "Livestock"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              {area === "crop" ? "Crop" : "Species"}
              <select
                required
                value={hostId}
                onChange={(event) => setHostId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select value chain</option>
                {hosts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Pest or disease observed
              <select
                value={issueId}
                onChange={(event) => setIssueId(event.target.value)}
                disabled={!hostId}
                className={inputClass}
              >
                <option value="">Choose a known profile (optional)</option>
                {issues.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Symptoms and observations
            <textarea
              required
              minLength={2}
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"
              placeholder="Describe what you observed"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              County / subcounty / ward
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={inputClass}
                placeholder="Enter location"
              />
            </label>
            <div>
              <span className={labelClass}>GPS coordinates</span>
              <button
                type="button"
                onClick={useLocation}
                className="mt-1.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-semibold"
              >
                <LocateFixed className="h-4 w-4 text-primary" /> Capture device location
              </button>
              {coords && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </span>
              )}
            </div>
            <label className={labelClass}>
              Date observed
              <input
                required
                type="date"
                value={observed}
                onChange={(event) => setObserved(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Estimated severity
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className={inputClass}
              >
                {["Low", "Medium", "High", "Critical"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Estimated affected area
              <input
                value={areaAffected}
                onChange={(event) => setAreaAffected(event.target.value)}
                className={inputClass}
                placeholder="e.g. hectares or field section"
              />
            </label>
          </div>
          <label className={labelClass}>
            Photo evidence
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setPhoto(await readImage(file));
                  setPhotoName(file.name);
                  setError("");
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : "Photo unavailable.");
                }
              }}
              className="mt-1.5 block w-full rounded-lg border border-input bg-background p-2 text-sm"
            />
          </label>
          {photo && (
            <div className="flex items-center gap-3">
              <img
                src={photo}
                alt="Surveillance evidence preview"
                className="h-20 w-20 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-sm">{photoName}</span>
              <button
                type="button"
                onClick={() => {
                  setPhoto("");
                  setPhotoName("");
                }}
                aria-label="Remove photo"
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950" role="status">
              {error}
            </p>
          )}
          {status && (
            <p className="rounded-lg bg-secondary p-3 text-sm text-primary-deep" role="status">
              {status}
            </p>
          )}
          <button
            disabled={sending}
            className="h-12 w-full rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
          >
            {sending ? "Checking submission service…" : "Submit report or save draft"}
          </button>
        </form>
        <aside className="space-y-4">
          <div className={panel}>
            <h2 className="font-display font-bold">Submission status</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Reports can only be marked received, reviewed or published after a server report
              service and authenticated review workflow are connected. This page never treats a
              local draft as a submitted report.
            </p>
          </div>
          <div className={panel}>
            <h2 className="font-display font-bold">Related tools</h2>
            <a
              href="/mobile-scouting"
              className="mt-3 flex items-center justify-between rounded-lg bg-muted p-3 text-sm font-semibold"
            >
              Mobile scouting <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/pest-risk"
              className="mt-2 flex items-center justify-between rounded-lg bg-muted p-3 text-sm font-semibold"
            >
              View profile distribution <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function MobileScoutingPage() {
  const [crops, setCrops] = useState<ValueChain[]>([]);
  const [cropId, setCropId] = useState("");
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [profileId, setProfileId] = useState("");
  const [observation, setObservation] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [drafts, setDrafts] = useState<ScoutDraft[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiList<ValueChain>("/crops/crops/", { is_active: "true" })
      .then(setCrops)
      .catch(() => setCrops([]));
    setDrafts(readLocalDrafts<ScoutDraft>("kalro-scout-drafts"));
  }, []);
  useEffect(() => {
    if (!cropId) {
      setProfiles([]);
      setProfileId("");
      return;
    }
    let active = true;
    apiList<ProfileSummary>("/crops/pests-diseases/", { crop: cropId })
      .then((items) => active && setProfiles(items))
      .catch(() => active && setProfiles([]));
    return () => {
      active = false;
    };
  }, [cropId]);
  async function captureLocation() {
    if (!navigator.geolocation) {
      setMessage("GPS is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocation(
          `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        );
        setMessage("");
      },
      () => setMessage("Location permission was not granted."),
    );
  }
  async function storeDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const crop = crops.find((item) => String(item.id) === cropId);
    const profile = profiles.find((item) => String(item.id) === profileId);
    const draft: ScoutDraft = {
      localId: makeId(),
      cropId,
      cropName: crop?.name || "",
      profileId,
      profileName: profile?.name || "",
      observation,
      observedAt: new Date().toISOString(),
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
      ...(photo ? { photoDataUrl: photo } : {}),
      status: "local draft",
    };
    try {
      setDrafts(saveLocalDraft("kalro-scout-drafts", draft) as ScoutDraft[]);
      setMessage("Draft saved on this device. It is not synced or submitted.");
      setObservation("");
      setPhoto("");
      setPhotoName("");
    } catch {
      setMessage("Could not save locally; browser storage may be full. No report was submitted.");
    }
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <PageIntro
        eyebrow="Field toolkit"
        title="Mobile Scouting"
        description="A lightweight scouting workflow with browser-local drafts, camera input and optional GPS. Unsynced entries remain on this device until a reporting API is connected."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[430px] overflow-hidden rounded-[2.4rem] border-8 border-slate-800 bg-card shadow-2xl max-sm:max-w-full max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
          <div className="grid">
            <div className="hidden h-5 items-center justify-center bg-slate-800 sm:flex">
              <span className="h-1.5 w-16 rounded-full bg-slate-500" />
            </div>
            <section className="p-5 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">
                    Scouting session
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-primary-deep">
                    Field observations
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-950">
                  <CloudOff className="h-3.5 w-3.5" /> Offline drafts
                </span>
              </div>
              <form onSubmit={storeDraft} className="mt-6 space-y-4">
                <label className={labelClass}>
                  Farm / field
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Farm, field or county"
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={captureLocation}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
                >
                  <Compass className="h-4 w-4 text-primary" /> Capture GPS
                </button>
                <label className={labelClass}>
                  Crop
                  <select
                    required
                    value={cropId}
                    onChange={(event) => setCropId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select crop</option>
                    {crops.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Possible pest or disease
                  <select
                    value={profileId}
                    onChange={(event) => setProfileId(event.target.value)}
                    disabled={!cropId}
                    className={inputClass}
                  >
                    <option value="">Uncertain / not listed</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  Observation
                  <textarea
                    required
                    minLength={2}
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    rows={4}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm"
                    placeholder="What did you see in the field?"
                  />
                </label>
                <label className={labelClass}>
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setPhoto(await readImage(file));
                        setPhotoName(file.name);
                        setMessage("");
                      } catch (reason) {
                        setMessage(reason instanceof Error ? reason.message : "Photo unavailable.");
                      }
                    }}
                    className="mt-1.5 block w-full rounded-lg border border-input bg-background p-2 text-sm"
                  />
                </label>
                {photo && (
                  <div className="flex items-center gap-3">
                    <img
                      src={photo}
                      alt="Scouting observation"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <span className="flex-1 truncate text-sm">{photoName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto("");
                        setPhotoName("");
                      }}
                      aria-label="Remove scouting image"
                      className="p-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {message && (
                  <p role="status" className="rounded-lg bg-secondary p-3 text-sm">
                    {message}
                  </p>
                )}
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground">
                  <Plus className="h-4 w-4" /> Save scouting draft
                </button>
              </form>
            </section>
            <aside className="border-t border-border bg-secondary/50 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="font-display font-bold">Sync status</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Local drafts are stored in browser storage. There is no backend scouting/report
                endpoint to sync them to yet.
              </p>
              <div className="mt-5 rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">
                  {drafts.length} saved draft{drafts.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  On this device only · not reviewed
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="font-display font-bold">Recent scouting</h3>
              </div>
              {drafts.length ? (
                <ul className="mt-3 space-y-2">
                  {drafts.slice(0, 8).map((draft) => (
                    <li key={draft.localId} className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold">{draft.profileName || draft.cropName}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {draft.observation}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                        <CloudOff className="h-3 w-3" /> Local only
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No scouting drafts yet.</p>
              )}
              <a
                href="/surveillance"
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary"
              >
                Surveillance submission <ChevronRight className="h-4 w-4" />
              </a>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
