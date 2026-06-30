import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";
import { ogImage } from "@/features/ui/site-content";

export const metadata: Metadata = {
  title: "How This Works | EU - Heat Zones",
  description: "How EU - Heat Zones turns recent reports into travel-awareness map zones.",
  openGraph: {
    title: "How This Works | EU - Heat Zones",
    description: "How EU - Heat Zones turns recent reports into travel-awareness map zones.",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "How This Works | EU - Heat Zones",
    description: "How EU - Heat Zones turns recent reports into travel-awareness map zones.",
    images: [ogImage],
  },
};

export default function HowItWorksPage() {
  return (
    <InfoPageShell
      eyebrow="Method"
      title="How EU - Heat Zones works"
      intro="EU - Heat Zones helps people inspect recent travel-awareness signals across Europe. The map is built to answer a simple question fast: what has been happening lately in the country or city I am about to visit?"
    >
      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">1. Search or move the map</h2>
        <p className="text-sm leading-7 text-slate-300">
          Start from a whole-country view or jump straight to a city. Search recognizes English and local-language names as well as common aliases — &ldquo;Napoli&rdquo; finds Naples, &ldquo;Bruxelles&rdquo; finds Brussels. Coverage spans all 27 EU member states down to city level.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">2. Read the visible heat zones</h2>
        <p className="text-sm leading-7 text-slate-300">
          Each city-level zone is a hexagon colored by its dominant event type over a rolling 180-day window. Zone intensity reflects an aggregate score: the average confidence of the underlying reports plus a small bonus when multiple incidents corroborate the same area, capped at 0.95. Four event types are tracked — harassment, robbery, assault, and violence.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">3. Inspect the underlying reports</h2>
        <p className="text-sm leading-7 text-slate-300">
          The side panel lists reports from the area currently in view. Open any card to read the summary, timing, location, confidence score, and status tier — verified, corroborated, or unverified — along with a link back to the original source post.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
