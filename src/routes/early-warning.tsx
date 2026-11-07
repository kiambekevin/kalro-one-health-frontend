import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, PawPrint, ShieldAlert, Sprout } from "lucide-react";
import { apiGet, apiList, type PestDisease, type ValueChain } from "@/lib/api";

const CountyDistributionMap = lazy(() => import("@/features/risk-map/CountyDistributionMap"));

type HealthArea = "crop" | "livestock";
type IssueSummary = PestDisease & { crop_name?: string; species_name?: string };
type Metric = "distribution" | "impact" | "category" | "agent" | "damage";

export function EarlyWarningPage() {
  const [healthArea, setHealthArea] = useState<HealthArea>("crop");
  const [valueChains, setValueChains] = useState<ValueChain[]>([]);
  const [valueChainId, setValueChainId] = useState("");
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [issueId, setIssueId] = useState("");
  const [profile, setProfile] = useState<PestDisease | null>(null);
  const [metric, setMetric] = useState<Metric>("distribution");
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [loadingChains, setLoadingChains] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");

  const apiRoot = healthArea === "crop" ? "/crops" : "/livestock";
  const activeChain = valueChains.find((item) => String(item.id) === valueChainId);
  const counties = profile?.hotspots_counties_in_kenya_detail || [];
  const countyNames = useMemo(() => counties.map((county) => county.name), [counties]);
  const impactLabel = healthArea === "crop" ? "Severity" : "Economic impact";
  const metricValue = (() => {
    if (!profile) return "Select a health profile";
    switch (metric) {
      case "distribution":
        return counties.length
          ? `${counties.length} hotspot ${counties.length === 1 ? "county" : "counties"}`
          : "No hotspot counties recorded";
      case "impact":
        return healthArea === "crop"
          ? profile.severity_display || profile.severity || "Not provided"
          : profile.economic_impact_display || profile.economic_impact || "Not provided";
      case "category":
        return profile.category_detail?.name || profile.category_name || "Not provided";
      case "agent":
        return (
          profile.causative_agent ||
          profile.agent_type_detail?.name ||
          profile.agent_type_name ||
          "Not provided"
        );
      case "damage":
        return (
          profile.damage_type_detail?.name ||
          profile.damage_type_name ||
          (profile.zoonotic ? "Zoonotic" : "Not provided")
        );
    }
  })();
  const metricOptions: { value: Metric; label: string }[] = [
    { value: "distribution", label: "County distribution" },
    { value: "impact", label: impactLabel },
    { value: "category", label: "Health category" },
    { value: "agent", label: "Causative agent" },
    { value: "damage", label: healthArea === "crop" ? "Damage type" : "Zoonotic status" },
  ];

  useEffect(() => {
    let active = true;
    setLoadingChains(true);
    setValueChains([]);
    setValueChainId("");
    setIssues([]);
    setIssueId("");
    setProfile(null);
    setLoadingIssues(false);
    setLoadingProfile(false);
    setSelectedCounty(null);
    setError("");
    const path = healthArea === "crop" ? "/crops/crops/" : "/livestock/species/";
    apiList<ValueChain>(path, { is_active: "true" })
      .then((items) => active && setValueChains(items))
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Could not load value chains."),
      )
      .finally(() => active && setLoadingChains(false));
    return () => {
      active = false;
    };
  }, [healthArea]);

  useEffect(() => {
    if (!valueChainId) {
      setIssues([]);
      setIssueId("");
      setProfile(null);
      setLoadingIssues(false);
      setLoadingProfile(false);
      return;
    }
    let active = true;
    setLoadingIssues(true);
    setIssues([]);
    setIssueId("");
    setProfile(null);
    setSelectedCounty(null);
    setError("");

    const query =
      healthArea === "crop" ? { crop: valueChainId, is_active: "true" } : { species: valueChainId };
    apiList<IssueSummary>(`${apiRoot}/pests-diseases/`, query)
      .then((items) => active && setIssues(items))
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Could not load health profiles."),
      )
      .finally(() => active && setLoadingIssues(false));
    return () => {
      active = false;
    };
  }, [healthArea, apiRoot, valueChainId]);

  useEffect(() => {
    if (!issueId) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    let active = true;
    setLoadingProfile(true);
    setProfile(null);
    setSelectedCounty(null);
    setError("");
    apiGet<PestDisease>(`${apiRoot}/pests-diseases/${issueId}/`)
      .then((item) => active && setProfile(item))
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : "Could not load this profile."),
      )
      .finally(() => active && setLoadingProfile(false));
    return () => {
      active = false;
    };
  }, [apiRoot, issueId]);

  function changeHealthArea(next: HealthArea) {
    if (next === healthArea) return;
    setHealthArea(next);
    setMetric("distribution");
  }

  return (
    <div className="min-h-[70vh] bg-background">
      <section className="bg-primary-deep text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 sm:py-12">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </a>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5" /> Backend-recorded distribution
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
            Pest & disease distribution map
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
            Choose a health area, value chain and profile to map counties listed. Metrics show profile data only; no forecast or action-window estimates are
            generated currenly.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9">
        <section
          className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
          aria-label="Map filters"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Health area
              <span className="mt-2 flex h-11 rounded-lg border border-input bg-background p-1">
                <button
                  type="button"
                  onClick={() => changeHealthArea("crop")}
                  aria-pressed={healthArea === "crop"}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold ${healthArea === "crop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <Sprout className="h-4 w-4" /> Crops
                </button>
                <button
                  type="button"
                  onClick={() => changeHealthArea("livestock")}
                  aria-pressed={healthArea === "livestock"}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md text-sm font-semibold ${healthArea === "livestock" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <PawPrint className="h-4 w-4" /> Livestock
                </button>
              </span>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Value chain
              <select
                value={valueChainId}
                onChange={(event) => setValueChainId(event.target.value)}
                disabled={loadingChains}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="">
                  {loadingChains
                    ? "Loading…"
                    : `Choose ${healthArea === "crop" ? "a crop" : "a species"}`}
                </option>
                {valueChains.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Pest or disease
              <select
                value={issueId}
                onChange={(event) => setIssueId(event.target.value)}
                disabled={!valueChainId || loadingIssues}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="">{loadingIssues ? "Loading profiles…" : "Choose a profile"}</option>
                {issues.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Profile metric
              <select
                value={metric}
                onChange={(event) => setMetric(event.target.value as Metric)}
                disabled={!profile}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p
              className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {valueChainId && !loadingIssues && issues.length === 0 && !error && (
            <p className="mt-4 text-sm text-muted-foreground">
              No active health profiles are available for this value chain.
            </p>
          )}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            The map always shows recorded county distribution. Other metrics are profile-level
            values because the backend does not provide those measures by county.
          </p>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
              <div>
                <h2 className="font-display text-lg font-bold text-primary-deep">
                  {profile?.name || "County distribution"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeChain?.name || "Select a value chain"}
                  {profile
                    ? ` · ${counties.length} listed hotspot ${counties.length === 1 ? "county" : "counties"}`
                    : " · Select a profile to show its recorded counties"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#e5a52f]" />{" "}
                {metricOptions.find((option) => option.value === metric)?.label}: {metricValue}
              </span>
            </div>
            <div className="h-[420px] sm:h-[540px]">
              <Suspense
                fallback={
                  <div className="grid h-full place-items-center bg-secondary text-sm text-muted-foreground">
                    Loading map…
                  </div>
                }
              >
                <CountyDistributionMap
                  counties={countyNames}
                  selected={selectedCounty}
                  onSelect={setSelectedCounty}
                />
              </Suspense>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
              <span className="inline-flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm bg-[#e5a52f]" /> County included in profile
                distribution
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="h-3 w-3 rounded-sm bg-[#dfe8df]" /> No county listed in this profile
              </span>
            </div>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold text-primary-deep">Profile metrics</h2>
            </div>
            {!profile ? (
              <div className="mt-6 rounded-xl bg-muted/70 p-5 text-center text-sm text-muted-foreground">
                {loadingProfile
                  ? "Loading selected profile…"
                  : "Select a value chain and health profile to see its backend-provided metrics."}
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeChain?.name} · {profile.code}
                </p>
                <dl className="mt-5 space-y-3">
                  <div className="rounded-xl bg-secondary/70 p-4">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {metricOptions.find((option) => option.value === metric)?.label}
                    </dt>
                    <dd className="mt-1 text-lg font-bold text-primary-deep">{metricValue}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/70 p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {impactLabel}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {healthArea === "crop"
                          ? profile.severity_display || profile.severity || "—"
                          : profile.economic_impact_display || profile.economic_impact || "—"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/70 p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Category
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {profile.category_detail?.name || profile.category_name || "—"}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/70 p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Damage / status
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {profile.damage_type_detail?.name ||
                          profile.damage_type_name ||
                          (profile.zoonotic ? "Zoonotic" : "—")}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/70 p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Causative agent
                      </dt>
                      <dd className="mt-1 line-clamp-3 text-sm font-semibold">
                        {profile.causative_agent ||
                          profile.agent_type_detail?.name ||
                          profile.agent_type_name ||
                          "—"}
                      </dd>
                    </div>
                  </div>
                </dl>
                {selectedCounty && (
                  <div className="mt-5 rounded-xl border border-border p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Selected county
                    </p>
                    <p className="mt-1 font-bold text-primary-deep">{selectedCounty}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {counties.some(
                        (county) =>
                          county.name.toLocaleLowerCase() === selectedCounty.toLocaleLowerCase(),
                      )
                        ? "This county is listed as a hotspot in the selected backend record."
                        : "This county is not listed as a hotspot in the selected backend record."}
                    </p>
                  </div>
                )}
                {!counties.length && (
                  <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    The selected record does not list hotspot counties. No distribution is inferred.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Map highlights are based only on counties explicitly attached to the selected backend
          profile. Unhighlighted areas do not imply absence. Risk forecasts and action windows are
          intentionally omitted.
        </p>
      </div>
    </div>
  );
}
