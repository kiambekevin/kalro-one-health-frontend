import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bug,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  MapPin,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { apiGet, apiList, apiUrl, imageUrl, type ApiImage, type LibraryResource, type PestDisease } from "@/lib/api";
import CountyDistributionMap from "@/features/risk-map/CountyDistributionMap";

type ProfileType = "crop" | "livestock";
type TabId = "overview" | "impact" | "risk-map" | "symptoms" | "management" | "resources";
type Tab = { id: TabId; label: string; icon: typeof Bug };

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: Bug },
  { id: "impact", label: "Impact", icon: ShieldAlert },
  { id: "risk-map", label: "Risk Map", icon: MapPin },
  { id: "symptoms", label: "Symptoms & diagnosis", icon: Stethoscope },
  { id: "management", label: "Management", icon: ClipboardList },
  { id: "resources", label: "Resources & images", icon: BookOpen },
];

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === "") return null;
  return <div className="rounded-xl bg-muted/70 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground">{children}</dd></div>;
}

function TextSection({ title, text }: { title: string; text?: string | null }) {
  if (!text?.trim()) return null;
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h3 className="font-display text-lg font-bold text-primary-deep">{title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{text}</p></section>;
}

function MediaTile({ media }: { media: ApiImage }) {
  const [broken, setBroken] = useState(false);
  const src = imageUrl(media.image || media.image_file);
  const title = media.caption || media.description || media.alt_text || "Related image";
  return <figure className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="grid aspect-[4/3] place-items-center bg-secondary text-primary/40">
      {src && !broken ? <img src={src} alt={media.alt_text || title} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" /> : <Bug className="h-10 w-10" />}
    </div>
    <figcaption className="p-3"><p className="line-clamp-2 text-sm font-semibold">{title}</p>{(media.stage || media.image_type || media.source || media.credit) && <p className="mt-1 text-xs text-muted-foreground">{[media.stage || media.image_type, media.source || media.credit].filter(Boolean).join(" · ")}</p>}</figcaption>
  </figure>;
}

function ListFacts({ title, values }: { title: string; values?: { id: number; name: string }[] | undefined }) {
  if (!values?.length) return null;
  return <section className="rounded-2xl border border-border bg-card p-5"><h3 className="font-display font-bold text-primary-deep">{title}</h3><ul className="mt-3 flex flex-wrap gap-2">{values.map((value) => <li key={value.id} className="rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">{value.name}</li>)}</ul></section>;
}

export function PestDiseaseDetailPage({ type, id }: { type: ProfileType; id: string }) {
  const [record, setRecord] = useState<PestDisease | null>(null);
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [libraryImages, setLibraryImages] = useState<ApiImage[]>([]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const root = type === "crop" ? "/crops" : "/livestock";
    setLoading(true); setError(""); setRecord(null); setResources([]); setLibraryImages([]); setTab("overview");
    apiGet<PestDisease>(`${root}/pests-diseases/${id}/`)
      .then(async (detail) => {
        if (!active) return;
        setRecord(detail);
        const [resourceRows, imageRows] = await Promise.all([
          apiList<LibraryResource>("/library/resources/", { search: detail.name }).catch(() => []),
          apiList<ApiImage>("/library/images/", { search: detail.name }).catch(() => []),
        ]);
        if (!active) return;
        const name = detail.name.toLocaleLowerCase();
        const isRelated = (entry: LibraryResource) => (entry.pest_disease_ref || "").toLocaleLowerCase().includes(name)
          || (type === "crop" ? entry.crop_pest_disease : entry.livestock_pest_disease)?.toLocaleLowerCase() === name;
        setResources(resourceRows.filter(isRelated));
        setLibraryImages(imageRows.filter((item) => (item.pest_disease_ref || "").toLocaleLowerCase().includes(name)));
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Unable to load this profile."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [type, id]);

  const backHref = `/search?type=${type}${type === "crop" ? `&crop=${new URLSearchParams(window.location.search).get("crop") || ""}` : `&species=${new URLSearchParams(window.location.search).get("species") || ""}`}`;

  if (loading) return <div className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6"><div className="h-6 w-40 animate-pulse rounded bg-muted" /><div className="mt-7 h-48 animate-pulse rounded-2xl bg-muted" /><div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  if (error || !record) return <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-4 py-12 text-center"><CircleHelp className="h-12 w-12 text-primary/50" /><h1 className="mt-4 font-display text-2xl font-bold">Profile unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "This record could not be found."}</p><a href={backHref} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Back to search</a></div>;
  const profileRecord = record;

  const titleSubject = type === "crop" ? record.crop_detail?.name || record.crop_name : record.species_detail?.name || record.species_name;
  const category = record.category_detail?.name || record.category_name || record.agent_type_detail?.name || record.agent_type_name;
  const countyList = record.hotspots_counties_in_kenya_detail || [];
  const media = [...(record.images_detail || []), ...libraryImages.filter((item) => !record.images_detail?.some((image) => image.image_file === item.image_file || image.image === item.image_file))];

  function content() {
    const record = profileRecord;
    switch (tab) {
      case "overview":
        return <div className="grid gap-4 md:grid-cols-2"><dl className="contents">
          <Field label={type === "crop" ? "Crop" : "Species"}>{titleSubject}</Field>
          <Field label="Category">{category}</Field>
          <Field label="Causative agent">{record.causative_agent || record.agent_type_detail?.name || record.agent_type_name}</Field>
          <Field label="Other names">{record.synonyms}</Field>
          <Field label="Seasonal pattern">{record.seasonal_pattern_display || record.seasonal_pattern}</Field>
          <Field label="Life cycle">{record.life_cycle_days ? `${record.life_cycle_days} days` : undefined}</Field>
          <Field label="Incubation period">{record.incubation_period}</Field>
          <Field label="Profile code">{record.code}</Field>
        </dl><ListFacts title="Susceptible varieties" values={record.susceptible_varieties_detail} /><ListFacts title="Susceptible breeds" values={record.susceptible_breeds_detail} /></div>;
      case "impact":
        return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={type === "crop" ? "Severity" : "Economic impact"}>{record.severity_display || record.severity || record.economic_impact_display || record.economic_impact}</Field>
          <Field label="Yield loss">{record.yield_loss_percentage_min != null || record.yield_loss_percentage_max != null ? `${record.yield_loss_percentage_min ?? "—"}% – ${record.yield_loss_percentage_max ?? "—"}%` : undefined}</Field>
          <Field label="Regulatory status">{[record.zoonotic ? "Zoonotic" : "", record.notifiable ? "Notifiable" : "", record.woah_code ? `WOAH ${record.woah_code}` : ""].filter(Boolean).join(" · ")}</Field>
          <Field label="Vector information">{record.is_vector ? `Vector${record.vector_for ? ` for ${record.vector_for}` : ""}` : undefined}</Field>
          <Field label="Vaccination">{record.vaccination_available ? "Available" : undefined}</Field>
        </div><TextSection title="Economic importance" text={record.economic_importance ?? null} />
          {!record.economic_importance && !record.severity && !record.economic_impact && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No impact information has been provided for this profile.</p>}
          {record.vaccination_notes && <TextSection title="Vaccination notes" text={record.vaccination_notes ?? null} />}</div>;
      case "risk-map":
        return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Field label="Eastern Africa">{record.east_africa_distribution}</Field><Field label="Africa">{record.africa_distribution}</Field><Field label="Global">{record.global_distribution}</Field></div>
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#e5a52f]" /> Backend-listed hotspot</span><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#dfe8df]" /> No hotspot recorded for this profile</span></div>
            <div className="h-[420px] overflow-hidden rounded-xl border border-border sm:h-[520px]"><CountyDistributionMap counties={countyList.map((county) => county.name)} /></div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Highlighted counties are reported in this profile’s backend data. Unhighlighted areas do not indicate absence of the pest or disease.</p>
          </div>
          {countyList.length ? <section className="rounded-2xl border border-border bg-card p-5"><h3 className="font-display font-bold text-primary-deep">Backend-listed hotspot counties</h3><ul className="mt-3 flex flex-wrap gap-2">{countyList.map((county) => <li key={county.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground"><MapPin className="h-3.5 w-3.5" />{county.name}</li>)}</ul></section> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hotspot counties are recorded for this profile.</p>}
        </div>;
      case "symptoms":
        return <div className="space-y-4"><TextSection title="Symptoms" text={record.symptoms || record.clinical_signs || null} /><TextSection title="Diagnosis" text={record.diagnosis ?? null} />
          {record.symptoms || record.clinical_signs || record.diagnosis ? null : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No symptom or diagnosis details have been provided for this profile.</p>}
        </div>;
      case "management":
        return <div className="space-y-4"><TextSection title="Cultural control" text={record.cultural_control ?? null} /><TextSection title="Biological control" text={record.biological_control ?? null} /><TextSection title="Chemical control" text={record.chemical_control ?? null} /><TextSection title="Control and prevention" text={record.control ?? null} />
          <ListFacts title="Transmission routes" values={record.transmission_routes_detail} />
          {record.treatment_classes_detail?.length ? <section className="rounded-2xl border border-border bg-card p-5"><h3 className="font-display font-bold text-primary-deep">Treatment classes</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{record.treatment_classes_detail.map((treatment) => <div key={treatment.id} className="rounded-xl bg-muted/70 p-4"><p className="font-semibold">{treatment.name}</p><p className="mt-1 text-sm text-muted-foreground">{[treatment.route, treatment.withdrawal_period_meat != null ? `Meat withdrawal: ${treatment.withdrawal_period_meat} days` : "", treatment.withdrawal_period_milk != null ? `Milk withdrawal: ${treatment.withdrawal_period_milk} days` : ""].filter(Boolean).join(" · ")}</p></div>)}</div></section> : null}
          {!record.cultural_control && !record.biological_control && !record.chemical_control && !record.control && !record.treatment_classes_detail?.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No management details have been provided for this profile.</p>}
        </div>;
      case "resources":
        return <div className="space-y-7">
          {media.length ? <section><h3 className="mb-4 font-display text-lg font-bold text-primary-deep">Related images</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{media.map((item, index) => <MediaTile key={`${item.id}-${index}`} media={item} />)}</div></section> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No images are linked to this profile.</div>}
          {resources.length ? <section><h3 className="mb-4 font-display text-lg font-bold text-primary-deep">Knowledge resources</h3><div className="grid gap-3 md:grid-cols-2">{resources.map((resource) => <article key={resource.id} className="rounded-xl border border-border bg-card p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><BookOpen className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h4 className="font-bold">{resource.title}</h4><p className="mt-1 text-xs text-muted-foreground">{[resource.resource_type, resource.format, resource.language, resource.year, resource.author].filter(Boolean).join(" · ")}</p>{resource.url_or_file && <a href={/^https?:\/\//i.test(resource.url_or_file) ? resource.url_or_file : apiUrl(resource.url_or_file)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open resource <ArrowLeft className="h-3.5 w-3.5 rotate-135" /></a>}</div></div></article>)}</div></section> : <p className="text-sm text-muted-foreground">No library resources are linked to this profile.</p>}
        </div>;
    }
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <section className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
          <a href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to {type === "crop" ? "crop" : "livestock"} profiles</a>
          <div className="mt-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{type === "crop" ? "Crop health" : "Livestock health"}</span>{category && <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">{category}</span>}</div><h1 className="mt-3 font-display text-3xl font-extrabold text-primary-deep sm:text-4xl">{record.name}</h1><p className="mt-2 text-muted-foreground">{titleSubject}{record.causative_agent ? ` · ${record.causative_agent}` : ""}</p></div>
            <div className="flex flex-wrap gap-2">{record.is_emerging && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900"><ShieldAlert className="h-3.5 w-3.5" /> Emerging</span>}{record.zoonotic && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900"><ShieldAlert className="h-3.5 w-3.5" /> Zoonotic</span>}{record.notifiable && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-900"><CheckCircle2 className="h-3.5 w-3.5" /> Notifiable</span>}</div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Pest or disease profile sections" className="flex min-w-max gap-1 border-b border-border">
            {TABS.map(({ id: tabId, label, icon: Icon }) => <button key={tabId} id={`tab-${tabId}`} role="tab" aria-selected={tab === tabId} aria-controls="profile-panel" onClick={() => setTab(tabId)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${tab === tabId ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}
          </div>
        </div>
        <section id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-6">{content()}</section>
      </div>
    </div>
  );
}