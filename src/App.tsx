import { SiteFooter, SiteHeader } from "@/components/layout/SiteHeader";
import { AboutPage } from "@/routes/about";
import { HomePage } from "@/routes/index";
import { EarlyWarningPage } from "@/routes/early-warning";
import { SearchPage } from "@/routes/search";
import { PestDiseaseDetailPage } from "@/routes/pest-disease-detail";
import {
  AIDiagnosticPage,
  DiagnosticResultsPage,
  EarlyAdvisoryPage,
  MobileScoutingPage,
  SurveillancePage,
} from "./routes/field-tools.tsx";
import { IPMGuidesPage, IPMResourceDetailPage } from "./routes/ipm-guides.tsx";

function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const detailMatch = pathname.match(/^\/pest-disease\/(crop|livestock)\/(\d+)$/);
  const detailType = detailMatch?.[1];
  const detailId = detailMatch?.[2];
  const resourceId: string = pathname.startsWith("/ipm-guides/")
    ? pathname.slice("/ipm-guides/".length)
    : "";
  const page =
    pathname === "/" ? (
      <HomePage />
    ) : pathname === "/about" ? (
      <AboutPage />
    ) : pathname === "/pest-risk" || pathname === "/early-warning/map" ? (
      <EarlyWarningPage />
    ) : pathname === "/early-warning" ? (
      <EarlyAdvisoryPage />
    ) : pathname === "/search" ? (
      <SearchPage />
    ) : pathname === "/ai-diagnostic" ? (
      <AIDiagnosticPage />
    ) : pathname === "/ai-diagnostic/results" ? (
      <DiagnosticResultsPage />
    ) : pathname === "/ipm-guides" ? (
      <IPMGuidesPage />
    ) : /^\d+$/.test(resourceId) ? (
      <IPMResourceDetailPage id={resourceId} />
    ) : pathname === "/surveillance" ? (
      <SurveillancePage />
    ) : pathname === "/mobile-scouting" ? (
      <MobileScoutingPage />
    ) : (detailType === "crop" || detailType === "livestock") && detailId ? (
      <PestDiseaseDetailPage type={detailType} id={detailId} />
    ) : (
      <NotFoundPage />
    );

  return (
    <>
      <SiteHeader />
      <main className="min-h-[70vh]">{page}</main>
      <SiteFooter />
    </>
  );
}