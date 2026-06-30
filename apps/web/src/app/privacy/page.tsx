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
          You do not need to sign up or log in to use the map. The application is designed around anonymous access to public-facing travel-awareness information.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Local device state</h2>
        <p className="text-sm leading-7 text-slate-300">
          The app currently stores only lightweight local state needed for the experience, such as whether the onboarding has been dismissed on this device.
        </p>
      </SurfaceCard>

      <SurfaceCard className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Infrastructure logs</h2>
        <p className="text-sm leading-7 text-slate-300">
          Even when the app itself avoids user profiling, standard web infrastructure can still create technical request logs for uptime, abuse control, and rate limiting. Those operational logs should be kept as small and short-lived as possible.
        </p>
      </SurfaceCard>
    </InfoPageShell>
  );
}
