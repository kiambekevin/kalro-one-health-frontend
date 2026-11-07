import { Leaf } from "lucide-react";
import logo from "@/assets/logo.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/search?type=crop", label: "Health profiles" },
  { to: "/pest-risk", label: "Pest Risk Map" },
] as const;

export function SiteHeader() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  return (
    <header className="sticky top-0 z-[1000] border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
            {/* <Leaf className="h-6 w-6" /> */}
            <img
              src={logo ?? "https://keep.kalro.org/images/assets/kalro-logo.png"} 
              alt="KALRO Logo emblem in embossed dark green, yellow accent on white colors"
              className="h-8 w-8 shrink-0 rounded-xl bg-white object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold text-primary-deep">
              KALRO One Health Portal
            </span>
            <span className="block text-[11px] text-muted-foreground">Afya ya Mazao Mkononi</span>
          </span>
        </a>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <a
              key={n.to}
              href={n.to}
              aria-current={pathname === n.to.split("?")[0] ? "page" : undefined}
              className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-secondary hover:text-primary-deep sm:px-3 sm:text-sm ${pathname === n.to.split("?")[0] ? "bg-secondary text-primary-deep" : "text-muted-foreground"}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary-deep text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm sm:px-6">
        <p>© {2026} Kenya Agricultural and Livestock Research Organization (KALRO)</p>
        <p className="opacity-75">
          Empowering sustainable agriculture in Kenya
        </p>
      </div>
    </footer>
  );
}
