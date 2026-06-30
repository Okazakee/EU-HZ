import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";

export const metadata: Metadata = {
  title: "How This Works | EU - Heat Zones",
  description: "How EU - Heat Zones turns recent reports into travel-awareness map zones.",
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
          Start from a whole country view or jump straight into a city. The search supports country-wide checks and city-level navigation so you can evaluate a trip in seconds.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">2. Read the visible heat zones</h2>
        <p className="text-sm leading-7 text-slate-300">
          The map groups recent reports into broader zones at high level and into more precise areas as you zoom in. Each zone color reflects the dominant incident type seen in that area.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">3. Inspect the underlying reports</h2>
        <p className="text-sm leading-7 text-slate-300">
          The side panel only shows reports from the area currently in view. Open any card to read the summary, the timing, the location context, and the original source coverage behind it.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
