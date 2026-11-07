import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("React app", () => {
  it("renders the home page with navigation", () => {
    window.history.replaceState({}, "", "/");
    render(<App />);

    expect(screen.getByRole("heading", { name: /healthy crops/i })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: /pest risk map/i })
        .some((link) => link.getAttribute("href") === "/pest-risk"),
    ).toBe(true);
    expect(screen.getByRole("link", { name: /ai diagnostic/i })).toHaveAttribute("href", "/ai-diagnostic");
    expect(screen.getByRole("link", { name: /ipm guides/i })).toHaveAttribute("href", "/ipm-guides");
    expect(screen.getByRole("link", { name: /early warning/i })).toHaveAttribute("href", "/early-warning");
    expect(screen.getByRole("link", { name: /submit surveillance/i })).toHaveAttribute("href", "/surveillance");
    expect(screen.getByRole("link", { name: /mobile scouting/i })).toHaveAttribute("href", "/mobile-scouting");
  });

  it.each([
    ["/pest-risk", /pest & disease distribution map/i],
    ["/ai-diagnostic", /ai diagnostic/i],
    ["/ipm-guides", /integrated pest management guides/i],
    ["/early-warning", /early warning & advisories/i],
    ["/surveillance", /submit surveillance/i],
    ["/mobile-scouting", /mobile scouting/i],
  ])("renders the tool route %s", (path, heading) => {
    window.history.replaceState({}, "", path);
    const view = render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    view.unmount();
  });
});
