import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";

export const metadata: Metadata = {
  title: "Data Sources | EU - Heat Zones",
  description: "How source material is selected and transformed into EU - Heat Zones map signals.",
};

export default function DataSourcesPage() {
  return (
    <InfoPageShell
      eyebrow="Sources"
      title="Data sources"
      intro="The product is designed around recent source material that can be normalized into a common Europe-wide view. The goal is not to keep endless archives. The goal is to keep fresh, relevant signals."
    >
      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Source types</h2>
        <p className="text-sm leading-7 text-slate-300">
          EU - Heat Zones is built to ingest recent reports from structured feeds such as news, public reporting channels, and other monitored sources that can be tied to a place and a recent time window.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Normalization</h2>
        <p className="text-sm leading-7 text-slate-300">
          Raw items are normalized into a shared incident shape with a place, time, event type, confidence score, and source references. Duplicate or near-duplicate entries should be collapsed before they affect the map.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Retention</h2>
        <p className="text-sm leading-7 text-slate-300">
          The current product direction is a short rolling window rather than a historical archive. Keeping roughly the last 30 days supports travel planning while keeping storage and operational cost under control.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
