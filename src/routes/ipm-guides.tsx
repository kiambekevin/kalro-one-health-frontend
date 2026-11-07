import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Download, FileText, Search, SlidersHorizontal } from "lucide-react";
import { apiGet, type ApiPage, type LibraryResource } from "@/lib/api";

type GuideResource = LibraryResource & { code?: string };
const resourceTypes = (items: GuideResource[]) => [...new Set(items.map((item) => item.resource_type).filter((value): value is string => Boolean(value)))].sort();
const fileHref = (path: string) => /^https?:\/\//i.test(path) ? path : new URL(path.replace(/^\//, ""), `${window.location.origin}/`).toString();

function ResourceCard({ item }: { item: GuideResource }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid h-40 place-items-center bg-secondary text-primary/65"><BookOpen className="h-12 w-12" /></div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          {item.resource_type && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{item.resource_type}</span>}
          {item.format && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{item.format}</span>}
        </div>
        <h2 className="mt-3 line-clamp-2 font-display text-lg font-bold text-foreground">{item.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{[item.author, item.year, item.language].filter(Boolean).join(" · ") || "Publication details not provided"}</p>
        {(item.crop_pest_disease || item.livestock_pest_disease || item.pest_disease_ref) && <p className="mt-3 line-clamp-2 text-sm text-foreground">Related to {item.crop_pest_disease || item.livestock_pest_disease || item.pest_disease_ref}</p>}
        <div className="mt-auto flex items-center gap-3 pt-5">
          <a href={`/ipm-guides/${item.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary">Details <ArrowUpRight className="h-4 w-4" /></a>
          {item.url_or_file ? <a href={fileHref(item.url_or_file)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Open file</a> : <span className="ml-auto text-xs text-muted-foreground">No file linked</span>}
        </div>
      </div>
    </article>
  );
}

export function IPMGuidesPage() {
  const params = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(params.get("search") || "");
  const [resourceType, setResourceType] = useState(params.get("resource_type") || "");
  const [relatedTo, setRelatedTo] = useState("");
  const [items, setItems] = useState<GuideResource[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState({ query: query, resourceType });

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<ApiPage<GuideResource> | GuideResource[]>("/library/resources/", {
      page,
      search: submitted.query || undefined,
      resource_type: submitted.resourceType || undefined,
      ordering: "title",
    }).then((response) => {
      if (!active) return;
      setItems(Array.isArray(response) ? response : response.results);
      setCount(Array.isArray(response) ? response.length : response.count);
      setError("");
    }).catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "The resource library is unavailable."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, submitted]);

  const types = useMemo(() => resourceTypes(items), [items]);
  const relatedOptions = useMemo(() => [...new Set(items.flatMap((item) => [item.crop_pest_disease, item.livestock_pest_disease, item.pest_disease_ref]).filter((value): value is string => Boolean(value)))].sort(), [items]);
  const visible = relatedTo ? items.filter((item) => [item.crop_pest_disease, item.livestock_pest_disease, item.pest_disease_ref].some((value) => value?.toLocaleLowerCase().includes(relatedTo.toLocaleLowerCase()))) : items;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmitted({ query: query.trim(), resourceType });
    const next = new URLSearchParams();
    if (query.trim()) next.set("search", query.trim());
    if (resourceType) next.set("resource_type", resourceType);
    window.history.replaceState({}, "", `/ipm-guides${next.size ? `?${next}` : ""}`);
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <header className="border-b border-border bg-secondary/60"><div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12"><a href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Home</a><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-primary">Knowledge library</p><h1 className="mt-2 font-display text-3xl font-extrabold text-primary-deep sm:text-4xl">Integrated Pest Management Guides</h1><p className="mt-2 max-w-2xl text-muted-foreground">Find extension resources and publications from the existing KALRO library.</p></div></header>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[270px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><SlidersHorizontal className="h-5 w-5 text-primary" /> Find a resource</h2><form onSubmit={applyFilters} className="mt-4 space-y-4">
          <label className="block text-sm font-semibold">Search title, author or pest/disease<span className="relative mt-1.5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" placeholder="Search resources" /></span></label>
          <label className="block text-sm font-semibold">Resource type<select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="block text-sm font-semibold">Crop or pest/disease<select value={relatedTo} onChange={(event) => setRelatedTo(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">All related profiles</option>{relatedOptions.map((option) => <option key={option}>{option}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted-foreground">Filters the currently loaded API results.</span></label>
          <button type="submit" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Apply filters</button>
        </form></aside>
        <section aria-live="polite"><div className="mb-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">{loading ? "Loading resources…" : `${count} resources`}</p></div>
          {loading ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-muted" />)}</div>
            : error ? <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center" role="alert"><p className="font-semibold">Could not load the resource library.</p><p className="mt-2 text-sm text-muted-foreground">{error}</p></div>
              : visible.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <ResourceCard key={item.id} item={item} />)}</div>
                : <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><FileText className="mx-auto h-10 w-10 text-primary/50" /><h2 className="mt-3 font-display text-lg font-bold">No resources found</h2><p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p></div>}
          {!loading && count > 50 && <nav className="mt-7 flex items-center justify-between border-t border-border pt-5" aria-label="Resource pages"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(count / 50)}</span><button disabled={page >= Math.ceil(count / 50)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Next</button></nav>}
        </section>
      </main>
    </div>
  );
}

export function IPMResourceDetailPage({ id }: { id: string }) {
  const [resource, setResource] = useState<GuideResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiGet<GuideResource>(`/library/resources/${id}/`).then((item) => active && setResource(item))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Resource unavailable."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="mx-auto min-h-[60vh] max-w-4xl animate-pulse px-4 py-12"><div className="h-8 w-64 rounded bg-muted" /><div className="mt-6 h-48 rounded-2xl bg-muted" /></div>;
  if (error || !resource) return <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center"><FileText className="h-10 w-10 text-primary/50" /><h1 className="mt-4 text-2xl font-bold">Resource unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "This resource was not found."}</p><a href="/ipm-guides" className="mt-5 text-sm font-semibold text-primary">Return to IPM Guides</a></div>;
  return <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-10 sm:px-6"><a href="/ipm-guides" className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Back to IPM Guides</a><article className="mt-6 overflow-hidden rounded-2xl border border-border bg-card"><div className="grid min-h-48 place-items-center bg-secondary text-primary/65"><BookOpen className="h-16 w-16" /></div><div className="p-6 sm:p-9"><div className="flex flex-wrap gap-2">{resource.resource_type && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{resource.resource_type}</span>}{resource.format && <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{resource.format}</span>}</div><h1 className="mt-4 font-display text-3xl font-extrabold text-primary-deep">{resource.title}</h1><dl className="mt-6 grid gap-4 sm:grid-cols-2">{[["Author", resource.author], ["Year", resource.year], ["Language", resource.language], ["Access", resource.access_level], ["Code", resource.code], ["Related crop", resource.crop_pest_disease], ["Related livestock", resource.livestock_pest_disease], ["Pest or disease", resource.pest_disease_ref]].filter(([, value]) => value).map(([label, value]) => <div key={label as string} className="rounded-xl bg-muted/70 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>{resource.url_or_file ? <a href={fileHref(resource.url_or_file)} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground"><Download className="h-4 w-4" /> Download / open resource</a> : <p className="mt-7 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No resource file URL is recorded.</p>}</div></article></main>;
}
