import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Bug,
  ClipboardList,
  Globe2,
  HeartHandshake,
  Leaf,
  Map,
  Search,
  ShieldCheck,
  Smartphone,
  Sprout,
  Stethoscope,
  Target,
  Users,
} from "lucide-react";
import hero from "@/assets/hero.png";
import { apiGet } from "@/lib/api";

type Stats = {
  crops: number;
  livestock: number;
  cropIssues: number;
  livestockIssues: number;
};

const PILLARS = [
  {
    icon: Search,
    title: "Diagnose",
    sub: "Identify pests and diseases from symptoms, images and field observations.",
  },
  {
    icon: Map,
    title: "Map risk",
    sub: "See where threats have been recorded across Kenya's 47 counties.",
  },
  {
    icon: BellRing,
    title: "Warn early",
    sub: "Deliver timely advisories so farmers can act before losses occur.",
  },
  {
    icon: BookOpen,
    title: "Guide",
    sub: "Share integrated pest management (IPM) knowledge in accessible formats.",
  },
];

const AUDIENCES = [
  {
    icon: Sprout,
    title: "Smallholder farmers",
    sub: "Get practical, localized guidance to protect crops and livestock.",
  },
  {
    icon: Stethoscope,
    title: "Extension officers",
    sub: "Support field diagnosis and surveillance with trusted reference data.",
  },
  {
    icon: ClipboardList,
    title: "Researchers & regulators",
    sub: "Explore structured records of pests, diseases and their distribution.",
  },
  {
    icon: Smartphone,
    title: "Field scouts",
    sub: "Capture observations on the go and feed them back into the system.",
  },
];

const TOOLS = [
  { icon: Map, title: "Pest Risk Map", sub: "Explore recorded county distribution", to: "/pest-risk" },
  { icon: Stethoscope, title: "AI Diagnostic", sub: "Review crop symptoms and images", to: "/ai-diagnostic" },
  { icon: BookOpen, title: "IPM Guides", sub: "Browse pest management resources", to: "/ipm-guides" },
  { icon: BellRing, title: "Early Warning", sub: "View current advisories", to: "/early-warning" },
  { icon: ClipboardList, title: "Submit Surveillance", sub: "Record a field observation", to: "/surveillance" },
  { icon: Smartphone, title: "Mobile Scouting", sub: "Capture field notes on the go", to: "/mobile-scouting" },
];

export function AboutPage() {
  const [stats, setStats] = useState<Stats>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<{ total: number }>("/crops/crops/stats/").catch(() => ({ total: 0 })),
      apiGet<{ total: number }>("/livestock/species/stats/").catch(() => ({ total: 0 })),
      apiGet<{ total: number }>("/crops/pests-diseases/stats/").catch(() => ({ total: 0 })),
      apiGet<{ total: number }>("/livestock/pests-diseases/stats/").catch(() => ({ total: 0 })),
    ])
      .then(([cropStats, speciesStats, cropIssueStats, livestockIssueStats]) => {
        if (!active) return;
        setStats({
          crops: cropStats.total,
          livestock: speciesStats.total,
          cropIssues: cropIssueStats.total,
          livestockIssues: livestockIssueStats.total,
        });
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const totalIssues = stats ? stats.cropIssues + stats.livestockIssues : undefined;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={hero}
          alt="KALRO crop and animal health"
          width={1600}
          height={640}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center text-primary-foreground sm:py-28">
          <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            About the platform
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Healthy <span className="text-harvest">Crops.</span> Healthy{" "}
            <span className="text-harvest">Livestock.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-primary-foreground/85 sm:text-base">
            A shared plant and animal health knowledge base from KALRO - bringing diagnostics,
            risk mapping and early warning to the people who grow and raise Kenya's food.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                Our mission
              </p>
              <h2 className="mt-2 text-3xl font-bold text-primary-deep">
                Putting plant and animal health knowledge in every farmer's hands
              </h2>
              <p className="mt-4 text-muted-foreground">
                KALRO’s mission is to conduct agricultural research through the application of science, technology, and innovation to catalyze sustainable growth and development across agriculture and livestock product value chains. At the heart of this mandate is the generation and dissemination of practical, demand-driven knowledge-specifically in the realms of plant and animal health-that responds directly to the challenges farmers face daily. By developing cost-effective disease prevention and control strategies, along with improved management practices for crops and livestock, KALRO ensures that critical health knowledge is not confined to laboratories but is actively transferred into the hands of those who rely on it for their livelihoods.
              </p>
              <p className="mt-3 text-muted-foreground">
                Putting this knowledge in every farmer’s hands requires a deliberate focus on collaboration and accessibility. KALRO works closely with county governments and stakeholders to ensure the efficient transfer of technologies and information, bridging the gap between research stations and rural communities. Whether through the development of rapid diagnostic tools for livestock diseases, the validation of vaccines, or the promotion of sustainable plant health practices, the ultimate goal is to empower farmers with the actionable intelligence they need to reduce losses, increase productivity, and secure food and income for their households. This farmer-centric approach ensures that scientific innovation translates directly into resilient and thriving agricultural systems.
              </p>
            </div>
            
       
        </div>
      </section>

      {/* What we do */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            What we do
          </p>
          <h2 className="mt-2 text-3xl font-bold text-primary-deep">From symptom to solution</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Four connected capabilities that turn scattered field knowledge into actionable advice.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold">{pillar.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pillar.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
          Who it's for
        </p>
        <h2 className="mt-2 text-3xl font-bold text-primary-deep">
          Built for everyone in the value chain
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary">
                <audience.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold">{audience.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{audience.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
            What we stand for
          </p>
          <h2 className="mt-2 text-3xl font-bold text-primary-deep">Principles that guide us</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Trusted & scientific",
                sub: "Built on KALRO research and reviewed by subject-matter experts.",
              },
              {
                icon: Leaf,
                title: "Sustainable by default",
                sub: "Promoting integrated pest management over reactive chemical use.",
              },
              {
                icon: Users,
                title: "Farmer-first",
                sub: "Designed with and for the people who grow and raise Kenya's food.",
              },
              {
                icon: Globe2,
                title: "Open & accessible",
                sub: "Available on the web and mobile, in low-bandwidth conditions.",
              },
              {
                icon: HeartHandshake,
                title: "Collaborative",
                sub: "Strengthened by extension officers, researchers and field scouts.",
              },
              {
                icon: Target,
                title: "Actionable",
                sub: "Every record points toward a clear next step, not just a diagnosis.",
              },
            ].map((value) => (
              <div key={value.title} className="rounded-xl border border-border bg-card p-5">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary text-primary">
                  <value.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold">{value.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{value.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

     

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-primary-deep p-6 text-primary-foreground sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-bold">Ready to find a health issue?</p>
            <p className="text-sm opacity-80">
              Search the repository by crop, species, category or symptom.
            </p>
          </div>
          <a
            href="/#identify"
            className="group inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-bold text-accent-foreground transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Search className="h-[17px] w-[17px]" /> Start searching
            <ArrowRight className="h-[17px] w-[17px] transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>
    </div>
  );
}