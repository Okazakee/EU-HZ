import type { Metadata } from "next";

import { SurfaceCard } from "@/features/ui/atoms";
import { InfoPageShell } from "@/features/ui/info-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | EU - Heat Zones",
  description: "Privacy information for EU - Heat Zones.",
};

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Privacy"
      title="Privacy policy"
      intro="EU - Heat Zones is being built as a lightweight public PWA without user accounts. The product should stay useful without turning visitors into profiles."
    >
      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">No account required</h2>
        <p className="text-sm leading-7 text-slate-300">
          You do not need to sign up or log in to use the map. The application is designed around anonymous access to public-facing travel-awareness information. There is no user database, no profile, and no tracking identifier attached to you.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Local device state</h2>
        <p className="text-sm leading-7 text-slate-300">
          The app stores a single key in your browser&apos;s localStorage: <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">hz-onboarding-complete</code>. It records that you have dismissed the intro overlay so it does not reappear. No other local state is written. Clearing site data in your browser removes it immediately.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Infrastructure logs</h2>
        <p className="text-sm leading-7 text-slate-300">
          The backend rate-limits public endpoints by IP address to prevent abuse. This means standard web infrastructure — the reverse proxy and the API process — creates short-lived technical request logs containing IP addresses, timestamps, and request paths. These logs exist for uptime and abuse control, not user profiling, and are kept as small and short-lived as the infrastructure allows.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
