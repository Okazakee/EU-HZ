import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";
import { appVersion } from "@/features/ui/site-content";

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
          Open the map, search a place, inspect the latest visible zones, and read the reports behind them. The focus is speed and clarity for short-term trip planning and general situational awareness across Europe.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Current scope</h2>
        <p className="text-sm leading-7 text-slate-300">
          The map covers all 27 EU member states through national news outlets monitored on X. Each report is classified into one of four event types — harassment, robbery, assault, or violence — and placed onto a city-level heat zone over a rolling 180-day window. The frontend is intentionally account-free; the backend keeps storage lean with a manual cleanup mode that removes incidents older than 30 days.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3" id="developer">
        <h2 className="text-lg font-semibold text-slate-50">Developer</h2>
        <p className="text-sm leading-7 text-slate-300">
          EU - Heat Zones is built and maintained by okazakee. The frontend deploys to Vercel and the backend runs as a Docker Compose stack on a VPS with Postgres/PostGIS. Stack: Next.js 16, React 19, Tailwind CSS 4, MapLibre, and React Query on the client; Go with pgx on the server.
        </p>
        <p className="text-sm leading-7 text-slate-300">
          App version {appVersion}. Source code and setup instructions live on{" "}
          <a
            className="text-slate-100 underline decoration-slate-600 underline-offset-4 transition hover:decoration-slate-300"
            href="https://github.com/okazakee/eu-hz"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
