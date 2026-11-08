import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Leaf,
  Map,
  Search,
  ShieldCheck,
  Smartphone,
  Sprout,
  Beef,
  Wheat,
  Stethoscope,
  X,
} from "lucide-react";

import hero from "@/assets/hero.png";
import partner1 from "@/assets/images/moald.png";
import partner2 from "@/assets/images/kalro.png";
import partner3 from "@/assets/images/fsrp.jpg";

import { apiGet, apiList, imageUrl, type ApiImage, type ValueChain } from "@/lib/api";

// Custom Cow Head Icon Component (Matching Lucide 17px icon styling)
const CowIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Horns */}
    <path d="M4 6c-1-2-1-4 0-4s2 2 3 4" />
    <path d="M20 6c1-2 1-4 0-4s-2 2-3 4" />

    {/* Ears */}
    <path d="M5 9c-2 0-3 2-2 3s2 1 2 0" />
    <path d="M19 9c2 0 3 2 2 3s-2 1-2 0" />

    {/* Head Outline / Muzzle */}
    <path d="M6 5h12l2 9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3l2-9z" />

    {/* Eyes */}
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />

    {/* Nostrils / Snout Line */}
    <path d="M10 14h4" />
  </svg>
);

type ValueTab = "crop" | "livestock";
type CropValue = ValueChain & { category_detail?: { name: string } | null };
type HealthCategory = { id: number; name: string };

const TOOLS = [
  { icon: Map, title: "Pest Risk Map", sub: "Explore recorded county distribution", to: "/pest-risk" },
  { icon: Stethoscope, title: "AI Diagnostic", sub: "Review crop symptoms and images", to: "/ai-diagnostic" },
  { icon: BookOpen, title: "IPM Guides", sub: "Browse pest management resources", to: "/ipm-guides" },
  { icon: BellRing, title: "Early Warning", sub: "View current advisories", to: "/early-warning" },
  { icon: ClipboardList, title: "Submit Surveillance", sub: "Record a field observation", to: "/surveillance" },
  { icon: Smartphone, title: "Mobile Scouting", sub: "Capture field notes on the go", to: "/mobile-scouting" },
];

// Static partner list — adjust names and file paths to match your assets folder
const PARTNERS = [
  { id: 1, name: "MoALD", logo: partner1, website: "https://kilimo.go.ke/" },
  { id: 2, name: "KALRO", logo: partner2, website: "https://www.kalro.org"  },
  { id: 3, name: "FSRP", logo: partner3, website: "https://www.fsrp.go.ke"  },
];

function chainImage(images?: ApiImage[]) {
  return imageUrl(images?.find((item) => item.image)?.image);
}

/** Single-select searchable dropdown with a checkbox indicator, rendered in a portal. */
function HostSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: { id: number; name: string }[];
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; openUp: boolean }>();

  const selected = options.find(
    (item) => item.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
  );
  const filtered = query.trim()
    ? options.filter((item) =>
        item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      )
    : options;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const panelHeight = Math.min(360, 56 + filtered.length * 44 + 8);
    const openUp = spaceBelow < panelHeight + 16 && r.top > panelHeight + 16;
    setRect({ top: r.bottom, left: r.left, width: r.width, openUp });
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const panelHeight = Math.min(360, 56 + filtered.length * 44 + 8);
      const openUp = spaceBelow < panelHeight + 16 && r.top > panelHeight + 16;
      setRect({ top: r.bottom, left: r.left, width: r.width, openUp });
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setQuery("");
    setOpen(false);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) pick(item.name);
    }
  }

  const panel =
    open && rect
      ? createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: rect.openUp ? undefined : rect.top + 8,
              bottom: rect.openUp ? window.innerHeight - rect.top + 8 : undefined,
              left: rect.left,
              width: rect.width,
              zIndex: 50,
            }}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={`Search ${placeholder.toLowerCase()}…`}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul role="listbox" aria-label={placeholder} className="max-h-80 overflow-auto p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">No matches.</li>
              ) : (
                filtered.map((item, index) => {
                  const isSelected = selected?.id === item.id;
                  const isActive = index === activeIndex;
                  return (
                    <li key={item.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => pick(item.name)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          isActive
                            ? "bg-secondary"
                            : isSelected
                              ? "bg-primary/10 font-semibold text-primary"
                              : "hover:bg-secondary"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-border px-3 py-2 text-right">
              <button
                type="button"
                onClick={() => pick("")}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <label className="block text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">
        {label}
        <span className="mt-2 block">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            onKeyDown={onTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={placeholder}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-4 text-left text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
              {selected ? selected.name : value.trim() || placeholder}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </span>
      </label>
      {panel}
    </>
  );
}

/** Auto-playing, responsive partner logo slider using static assets. */
function PartnerSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(2);

  // Responsive: how many logos fit per slide
  useEffect(() => {
    function updatePerView() {
      const w = window.innerWidth;
      setPerView(w >= 1024 ? 5 : w >= 640 ? 3 : 2);
    }
    updatePerView();
    window.addEventListener("resize", updatePerView);
    return () => window.removeEventListener("resize", updatePerView);
  }, []);

  const maxIndex = Math.max(0, PARTNERS.length - perView);

  // Keep index in bounds when perView changes
  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  // Autoplay
  useEffect(() => {
    if (paused || PARTNERS.length <= perView) return;
    const timer = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [paused, maxIndex, perView]);

  function scrollToIndex(next: number) {
    setIndex(Math.max(0, Math.min(next, maxIndex)));
  }

  const cardWidth = 100 / perView;

  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Our partners
            </p>
            <h2 className="mt-2 text-2xl font-bold text-primary-deep sm:text-3xl">
              Working together for healthier farms
            </h2>
          </div>
          {PARTNERS.length > perView && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollToIndex(index - 1)}
                disabled={index === 0}
                aria-label="Previous partners"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollToIndex(index + 1)}
                disabled={index >= maxIndex}
                aria-label="Next partners"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div
          className="mt-8 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          aria-roledescription="carousel"
          aria-label="Partner logos"
        >
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * cardWidth}%)` }}
          >
            {PARTNERS.map((partner) => {
              const card = (
                <div className="grid h-24 place-items-center rounded-xl border border-border bg-card px-4 transition hover:border-primary/40 hover:shadow-sm">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    loading="lazy"
                    className="max-h-14 w-auto max-w-full object-contain"
                  />
                </div>
              );
              return (
                <div
                  key={partner.id}
                  className="shrink-0 px-2"
                  style={{ width: `${cardWidth}%` }}
                >
                  {partner.website ? (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block"
                      title={partner.name}
                    >
                      {card}
                    </a>
                  ) : (
                    card
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        {PARTNERS.length > perView && (
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: maxIndex + 1 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={index === i}
                className={`h-2 rounded-full transition-all ${
                  index === i ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function HomePage() {
  const [tab, setTab] = useState<ValueTab>("crop");
  const [healthTab, setHealthTab] = useState<ValueTab>("crop");
  const [hostName, setHostName] = useState("");
  const [healthCategory, setHealthCategory] = useState("");
  const [healthSearch, setHealthSearch] = useState("");
  const [healthCategories, setHealthCategories] = useState<HealthCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [crops, setCrops] = useState<CropValue[]>([]);
  const [species, setSpecies] = useState<ValueChain[]>([]);
  const [stats, setStats] = useState<{
    crops: number;
    livestock: number;
    cropIssues: number;
    livestockIssues: number;
  }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      apiList<CropValue>("/crops/crops/", { is_active: "true" }),
      apiList<ValueChain>("/livestock/species/", { is_active: "true" }),
      apiGet<{ total: number }>("/crops/pests-diseases/stats/"),
      apiGet<{ total: number }>("/livestock/pests-diseases/stats/"),
    ])
      .then(([cropData, speciesData, cropStats, livestockStats]) => {
        if (!active) return;
        setCrops(cropData);
        setSpecies(speciesData);
        setStats({
          crops: cropData.length,
          livestock: speciesData.length,
          cropIssues: cropStats.total,
          livestockIssues: livestockStats.total,
        });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Unable to load value chains.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    const endpoint =
      healthTab === "crop" ? "/crops/pest-disease-categories/" : "/livestock/categories/";
    apiList<HealthCategory>(endpoint, { is_active: "true" })
      .then((items) => active && setHealthCategories(items))
      .catch(() => active && setHealthCategories([]))
      .finally(() => active && setCategoriesLoading(false));
    setHostName("");
    setHealthCategory("");
    return () => {
      active = false;
    };
  }, [healthTab]);

  function submitHealthSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = healthTab === "crop" ? crops : species;
    const selectedHost = values.find(
      (item) => item.name.toLocaleLowerCase() === hostName.trim().toLocaleLowerCase(),
    );
    const params = new URLSearchParams({ type: healthTab });
    if (selectedHost)
      params.set(healthTab === "crop" ? "crop" : "species", String(selectedHost.id));
    if (healthCategory) params.set("category", healthCategory);
    if (healthSearch.trim()) params.set("search", healthSearch.trim());
    if (hostName.trim() && !selectedHost)
      params.set("search", [healthSearch.trim(), hostName.trim()].filter(Boolean).join(" "));
    window.location.assign(`/search?${params.toString()}`);
  }

  const currentItems = tab === "crop" ? crops : species;
  const name = healthTab === "crop" ? "Crops" : "Livestock";
  const countValuechain = healthTab === "crop" ? stats?.crops : stats?.livestock;
  const count = healthTab === "crop" ? stats?.cropIssues : stats?.livestockIssues;

  return (
    <div>
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt="KALRO crop and animal health"
          width={1600}
          height={640}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center text-primary-foreground sm:py-28">
          <h1 className="mt-4 text-4xl font-extrabold sm:text-6xl">
            Healthy <span className="text-harvest">Crops.</span> Healthy{" "}
            <span className="text-harvest">Livestock.</span>
          </h1>

          <div className="mx-auto mt-10 flex max-w-md justify-around text-sm">
            <div>
              <p className="text-2xl font-bold text-harvest">{countValuechain ?? "—"}</p>
              {name}
            </div>
            <div>
              <p className="text-2xl font-bold text-harvest">{count}</p>Pests & diseases
            </div>
            <div>
              <p className="text-2xl font-bold text-harvest">47</p>Counties mapped
            </div>
          </div>
          <div id="identify" className="mx-auto mt-8 max-w-3xl text-left">
            <form
              onSubmit={submitHealthSearch}
              aria-label="Find a crop or livestock health issue"
              className="overflow-hidden rounded-[22px] border border-border bg-card text-foreground shadow-[0_24px_64px_hsl(154_40%_10%/.2)]"
            >
              <div
                className="flex border-b border-border bg-muted/70 p-2"
                role="tablist"
                aria-label="Choose health area"
              >
                {(["crop", "livestock"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={healthTab === value}
                    onClick={() => setHealthTab(value)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${healthTab === value ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-white/70"}`}
                  >
                    {value === "crop" ? (
                      <Wheat className="h-[17px] w-[17px]" />
                    ) : (
                      <CowIcon className="h-[17px] w-[17px]" />
                    )}
                    {value === "crop" ? "Crop health" : "Livestock health"}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                <HostSelect
                  label={`Choose a ${healthTab === "crop" ? "crop" : "livestock species"}`}
                  placeholder={healthTab === "crop" ? "Search crops" : "Search livestock species"}
                  value={hostName}
                  options={healthTab === "crop" ? crops : species}
                  onChange={setHostName}
                />
                <label className="block text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">
                  Health category
                  <span className="mt-2 block">
                    <select
                      value={healthCategory}
                      onChange={(event) => setHealthCategory(event.target.value)}
                      aria-label="Health category"
                      disabled={categoriesLoading}
                      className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm font-semibold normal-case tracking-normal text-foreground outline-none focus:border-primary disabled:opacity-60"
                    >
                      <option value="">All categories</option>
                      {healthCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
                <label className="sm:col-span-2">
                  <span className="sr-only">Search by issue, scientific name or symptom</span>
                  <span className="flex h-12 items-center gap-3 rounded-xl border border-input bg-background px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                    <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                    <input
                      value={healthSearch}
                      onChange={(event) => setHealthSearch(event.target.value)}
                      placeholder="e.g. yellowing leaves, disease name or symptom"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-lg sm:col-span-2"
                >
                  <Search className="h-[17px] w-[17px]" /> Explore health records
                  <ArrowRight className="h-[17px] w-[17px] transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
            <p className="mt-3 text-center text-xs text-white/65">
              Search the KALRO plant and animal health repository
            </p>
          </div>
        </div>
      </section>

      <section id="value-chains" className="scroll-mt-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Explore by value chain
              </p>
              <h2 className="mt-2 text-3xl font-bold text-primary-deep">
                What are you growing or raising?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Choose a crop or livestock species to find related health profiles.
              </p>
            </div>
            <div
              className="inline-flex w-fit rounded-xl border border-border bg-card p-1"
              role="tablist"
              aria-label="Value chain type"
            >
              {(["crop", "livestock"] as const).map((value) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {value === "crop" ? "Crops" : "Livestock"}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div
              className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
              aria-label="Loading value chains"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div
              className="mt-8 rounded-xl border border-destructive/30 bg-card p-6 text-center"
              role="alert"
            >
              <p className="font-semibold">Could not load value chains.</p>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
            </div>
          ) : currentItems.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              No active {tab === "crop" ? "crops" : "livestock species"} are available.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {currentItems.map((item) => {
                const photo = chainImage(item.images_detail);
                const filter = tab === "crop" ? "crop" : "species";
                return (
                  <a
                    key={item.id}
                    href={`/search?type=${tab}&${filter}=${item.id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="grid h-28 place-items-center overflow-hidden bg-secondary sm:h-36">
                      {photo ? (
                        <img
                          src={photo}
                          alt={item.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : tab === "crop" ? (
                        <Sprout className="h-9 w-9 text-primary/50" />
                      ) : (
                        <ShieldCheck className="h-9 w-9 text-primary/50" />
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-display font-bold text-foreground">{item.name}</p>
                      {item.scientific_name && (
                        <p className="mt-1 truncate text-xs italic text-muted-foreground">
                          {item.scientific_name}
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        View profiles{" "}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <PartnerSlider />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold text-primary-deep">Essential plant health tools</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {TOOLS.map((t) => {
            const inner = (
              <>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.sub}</p>
              </>
            );
            return t.to ? (
              <a
                key={t.title}
                href={t.to}
                className="rounded-xl border border-border bg-card p-5 text-center transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
              >
                {inner}
              </a>
            ) : (
              <div
                key={t.title}
                className="rounded-xl border border-border bg-muted/50 p-5 text-center opacity-75"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}