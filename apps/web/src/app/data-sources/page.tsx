import type { Metadata } from "next";

import { Pill, SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";

export const metadata: Metadata = {
  title: "Data Sources | EU - Heat Zones",
  description: "How source material is selected and transformed into EU - Heat Zones map signals.",
};

const sourceCountries = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark",
  "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands",
  "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

export default function DataSourcesPage() {
  return (
    <InfoPageShell
      eyebrow="Sources"
      title="Data sources"
      intro="The product is built around recent reports from national news outlets across the European Union, normalized into a common Europe-wide view. The goal is fresh, relevant signals — not an endless archive."
    >
      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Source types</h2>
        <p className="text-sm leading-7 text-slate-300">
          EU - Heat Zones currently ingests from 81 X accounts operated by national news outlets across all 27 EU member states — three outlets per country. Each source carries a fixed trust weight of 0.5. Ingestion is performed by an automated agent that gathers recent posts, filters duplicates, extracts a place and event type, and submits structured items to the API.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Countries covered</h2>
        <div className="flex flex-wrap gap-2">
          {sourceCountries.map((country) => (
            <Pill key={country}>{country}</Pill>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Normalization</h2>
        <p className="text-sm leading-7 text-slate-300">
          Each raw post is normalized into an incident with a title, summary, event type, confidence score (0–1), location, and timestamp. Event type is classified by keyword when not supplied: harassment, robbery, assault, or violence as the fallback. Confidence maps to a status tier — verified at 0.7 or above, corroborated at 0.55 or above, and unverified below that. Duplicate posts from the same source are collapsed before they reach the map.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Retention</h2>
        <p className="text-sm leading-7 text-slate-300">
          The heat map reflects a rolling 180-day window of incidents. A manual cleanup mode removes stored incidents older than 30 days to keep storage bounded, but the aggregation window is wider so recent seasonal trends remain visible. The product is a travel-awareness snapshot, not a historical archive.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
