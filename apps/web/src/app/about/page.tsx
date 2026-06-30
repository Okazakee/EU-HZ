import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";

export const metadata: Metadata = {
  title: "About | EU - Heat Zones",
  description: "About the EU - Heat Zones project and its current product scope.",
};

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="About"
      title="About EU - Heat Zones"
      intro="EU - Heat Zones is a Europe-focused awareness map for people who want a fast read on what has happened lately in a country or city before they travel, relocate, or move through an unfamiliar area."
    >
      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Product focus</h2>
        <p className="text-sm leading-7 text-slate-300">
          The current focus is speed and clarity: open the map, search a place, inspect the latest visible zones, and read the reports behind them. That makes it useful for short-term trip planning and general situational awareness.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Current scope</h2>
        <p className="text-sm leading-7 text-slate-300">
          The frontend is intentionally lightweight and account-free. The backend focuses on recent-source ingestion, normalization, duplicate control, short retention windows, and map aggregation across Europe.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3" id="developer">
        <h2 className="text-lg font-semibold text-slate-50">Developer</h2>
        <p className="text-sm leading-7 text-slate-300">
          This page is the project&apos;s developer reference entry inside the app shell. External source and maintainer links can be attached here once the public repository and production profile are finalized.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
