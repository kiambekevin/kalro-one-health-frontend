import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Bug, Search, SlidersHorizontal, X } from "lucide-react";
import { apiGet, apiList, imageUrl, type ApiImage, type ApiPage, type PestDisease } from "@/lib/api";

type SearchType = "crop" | "livestock";
type Lookup = { id: number; name: string };
const PAGE_SIZE = 12;
const API_PAGE_SIZE = 50;

function categoryName(record: PestDisease) {
  return record.category_name || record.agent_type_name || (record.zoonotic ? "Zoonotic" : "Health profile");
}

function ResultCard({ type, item, image, detail }: { type: SearchType; item: PestDisease; image: ApiImage | undefined; detail: PestDisease | undefined }) {
  const picture = imageUrl(image?.image);
  const subject = type === "crop" ? item.crop_name : item.species_name;
  const impact = type === "crop" ? item.severity_display || item.severity : item.economic_impact_display || item.economic_impact;
  return (
    <a href={`/pest-disease/${type}/${item.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-secondary">
        {picture ? <img src={picture} alt={image?.alt_text || image?.caption || item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-primary/40"><Bug className="h-12 w-12" /></div>}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-primary-deep">{categoryName(item)}</span>
        {impact && <span className="absolute right-3 top-3 rounded-full bg-primary-deep/90 px-2.5 py-1 text-xs font-semibold text-white">{impact}</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{subject || (type === "crop" ? "Crop health" : "Livestock health")}</p>
        <h2 className="mt-1 font-display text-xl font-bold text-foreground group-hover:text-primary">{item.name}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {image?.caption || image?.description || detail?.symptoms || detail?.clinical_signs || detail?.economic_importance || detail?.causative_agent || "Open this profile for identification, impact and management information."}
        </p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">View profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
      </div>
    </a>
  );
}

export function SearchPage() {
  const initial = new URLSearchParams(window.location.search);
  const [type, setType] = useState<SearchType>(initial.get("type") === "livestock" ? "livestock" : "crop");
  const [valueChainId, setValueChainId] = useState(initial.get("crop") || initial.get("species") || "");
  const [categoryId, setCategoryId] = useState(initial.get("category") || "");
  const [severity, setSeverity] = useState(initial.get("severity") || initial.get("economic_impact") || "");
  const [search, setSearch] = useState(initial.get("search") || "");
  const [applied, setApplied] = useState({ valueChainId, categoryId, severity, search });
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<PestDisease[]>([]);
  const [count, setCount] = useState(0);
  const [lookups, setLookups] = useState<Lookup[]>([]);
  const [details, setDetails] = useState<Record<number, PestDisease | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const basePath = type === "crop" ? "/crops" : "/livestock";
  const availablePages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const apiPage = Math.floor(page / Math.ceil(API_PAGE_SIZE / PAGE_SIZE)) + 1;
  const localStart = (page % Math.ceil(API_PAGE_SIZE / PAGE_SIZE)) * PAGE_SIZE;
  const visibleRecords = useMemo(() => records.slice(localStart, localStart + PAGE_SIZE), [records, localStart]);

  useEffect(() => {
    let active = true;
    const lookupPath = type === "crop" ? "/crops/pest-disease-categories/" : "/livestock/categories/";
    apiList<Lookup>(lookupPath).then((data) => active && setLookups(data)).catch(() => active && setLookups([]));
    return () => { active = false; };
  }, [type, basePath]);

  useEffect(() => {
    let active = true;
    const endpoint = `${basePath}/pests-diseases/`;
    const params: Record<string, string | number | undefined> = {
      page: apiPage,
      search: applied.search || undefined,
      category: applied.categoryId || undefined,
      ...(type === "crop"
        ? { crop: applied.valueChainId || undefined, severity: applied.severity || undefined }
        : { species: applied.valueChainId || undefined, economic_impact: applied.severity || undefined }),
    };
    setLoading(true);
    setError("");
    apiGet<ApiPage<PestDisease> | PestDisease[]>(endpoint, params)
      .then((response) => {
        if (!active) return;
        const pageData = Array.isArray(response) ? response : response.results;
        setRecords(pageData);
        setCount(Array.isArray(response) ? response.length : response.count);
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Unable to load profiles."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [type, basePath, applied, apiPage]);

  useEffect(() => {
    let active = true;
    const endpoint = `${basePath}/pests-diseases`;
    Promise.all(visibleRecords.map(async (record) => {
      try {
        const detail = await apiGet<PestDisease>(`${endpoint}/${record.id}/`);
        return [record.id, detail] as const;
      } catch {
        return [record.id, undefined] as const;
      }
    })).then((entries) => {
      if (active) setDetails((existing) => ({ ...existing, ...Object.fromEntries(entries) }));
    });
    return () => { active = false; };
  }, [visibleRecords, basePath]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setApplied({ valueChainId, categoryId, severity, search: search.trim() });
    const next = new URLSearchParams();
    next.set("type", type);
    if (valueChainId) next.set(type === "crop" ? "crop" : "species", valueChainId);
    if (categoryId) next.set("category", categoryId);
    if (severity) next.set(type === "crop" ? "severity" : "economic_impact", severity);
    if (search.trim()) next.set("search", search.trim());
    window.history.replaceState({}, "", `/search?${next.toString()}`);
  }

  function changeType(nextType: SearchType) {
    setType(nextType);
    setValueChainId("");
    setCategoryId("");
    setSeverity("");
    setApplied({ valueChainId: "", categoryId: "", severity: "", search });
    setPage(0);
    window.history.replaceState({}, "", `/search?type=${nextType}`);
  }

  const chainOptions = type === "crop" ? "/crops/crops/" : "/livestock/species/";
  const [valueChains, setValueChains] = useState<Lookup[]>([]);
  useEffect(() => {
    let active = true;
    apiList<Lookup>(chainOptions).then((data) => active && setValueChains(data)).catch(() => active && setValueChains([]));
    return () => { active = false; };
  }, [chainOptions]);

  const clearFilters = () => {
    setValueChainId(""); setCategoryId(""); setSeverity(""); setSearch("");
    setApplied({ valueChainId: "", categoryId: "", severity: "", search: "" }); setPage(0);
    window.history.replaceState({}, "", `/search?type=${type}`);
  };

  return (
    <div className="min-h-[70vh] bg-background">
      <section className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Home</a>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-primary">KALRO health knowledge base</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-primary-deep sm:text-4xl">Pests, diseases & health profiles</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Search verified profiles and filter by value chain, classification and impact.</p>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[270px_1fr] lg:py-10">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-display text-lg font-bold"><SlidersHorizontal className="h-5 w-5 text-primary" /> Filter profiles</div>
          <div className="mt-4 grid grid-cols-2 rounded-lg bg-muted p-1" role="group" aria-label="Profile type">
            {(["crop", "livestock"] as const).map((value) => <button key={value} onClick={() => changeType(value)} className={`rounded-md px-3 py-2 text-sm font-semibold ${type === value ? "bg-card text-primary-deep shadow-sm" : "text-muted-foreground"}`}>{value === "crop" ? "Crops" : "Livestock"}</button>)}
          </div>
          <form onSubmit={applyFilters} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Search
              <span className="relative mt-1.5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, signs, agent…" className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></span>
            </label>
            <label className="block text-sm font-semibold">{type === "crop" ? "Crop" : "Species"}
              <select value={valueChainId} onChange={(event) => setValueChainId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">All {type === "crop" ? "crops" : "species"}</option>{valueChains.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Category
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">All categories</option>{lookups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">{type === "crop" ? "Severity" : "Economic impact"}
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Any level</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
            </label>
            <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-deep">Apply filters</button>
            {(applied.valueChainId || applied.categoryId || applied.severity || applied.search) && <button type="button" onClick={clearFilters} className="inline-flex w-full items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Clear filters</button>}
          </form>
        </aside>

        <section aria-live="polite">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{loading ? "Loading profiles…" : `${count.toLocaleString()} profile${count === 1 ? "" : "s"} found`}</p>
          </div>
          {loading ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-muted" />)}</div>
            : error ? <div className="rounded-2xl border border-destructive/30 bg-card p-10 text-center" role="alert"><p className="font-semibold">Profiles could not be loaded.</p><p className="mt-2 text-sm text-muted-foreground">{error}</p><button onClick={() => setApplied({ ...applied })} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Retry</button></div>
              : visibleRecords.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"><Bug className="mx-auto h-10 w-10 text-primary/50" /><h2 className="mt-4 text-lg font-bold">No matching profiles</h2><p className="mt-2 text-sm text-muted-foreground">Try a different search or remove one of the filters.</p><button onClick={clearFilters} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Clear filters <X className="h-4 w-4" /></button></div>
                : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{visibleRecords.map((item) => <ResultCard key={item.id} type={type} item={item} image={details[item.id]?.images_detail?.[0]} detail={details[item.id]} />)}</div>}
          {!loading && !error && count > PAGE_SIZE && <nav aria-label="Search results pages" className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {availablePages}</span>
            <button disabled={page + 1 >= availablePages} onClick={() => setPage((current) => Math.min(availablePages - 1, current + 1))} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next <ArrowRight className="h-4 w-4" /></button>
          </nav>}
        </section>
      </div>
    </div>
  );
}