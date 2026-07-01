"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { useHeatQuery, useReportsQuery } from "@/features/api/queries";
import type { PlaceItem, ViewportBounds } from "@/features/api/types";
import { SearchBar } from "@/features/map/search-bar";
import { ReportsPanel } from "@/features/reports/reports-panel";
import { ModalShell } from "@/features/ui/modal-shell";
import { BrandMark } from "@/features/ui/brand-mark";
import { PrimaryButton, IconButton } from "@/features/ui/atoms";
import { DevTools } from "@/features/ui/dev-tools";
import { QueryErrorOverlay } from "@/features/ui/query-error-overlay";
import { SiteFooter } from "@/features/ui/site-footer";
import { appName, onboardingPoints } from "@/features/ui/site-content";

const isDev = process.env.NODE_ENV !== "production";

const MapShell = dynamic(() => import("@/features/map/map-shell").then((mod) => mod.MapShell), {
  ssr: false,
  loading: () => <StaticMapBackdrop />,
});

const IncidentModal = dynamic(
  () => import("@/features/reports/incident-modal").then((mod) => mod.IncidentModal),
  { ssr: false },
);

const defaultBounds: ViewportBounds = {
  west: -10,
  south: 35,
  east: 30,
  north: 60,
  zoom: 4.2,
};

const emptySubscribe = () => () => {};

type HomeClientProps = {
  initialOnboardingComplete: boolean;
};

export function HomeClient({ initialOnboardingComplete }: HomeClientProps) {
  const [isNavigating, startTransition] = useTransition();
  const [bounds, setBounds] = useState(defaultBounds);
  const [focusTarget, setFocusTarget] = useState<{
    lng: number;
    lat: number;
    zoom: number;
    bounds?: [number, number, number, number];
  } | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [onboardingOverride, setOnboardingOverride] = useState<boolean | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [reportsCollapsed, setReportsCollapsed] = useState(false);

  const persistedOnboardingComplete = useSyncExternalStore<boolean>(
    emptySubscribe,
    () => window.localStorage.getItem("hz-onboarding-complete") === "1",
    () => initialOnboardingComplete,
  );
  const onboardingComplete = onboardingOverride ?? persistedOnboardingComplete;
  const onboardingOpen = onboardingComplete !== true;
  const queriesEnabled = onboardingComplete === true;
  const heatQuery = useHeatQuery(bounds, queriesEnabled);
  const reportsQuery = useReportsQuery(bounds, queriesEnabled);
  const isPanelLoading =
    isNavigating ||
    heatQuery.isLoading ||
    heatQuery.isFetching ||
    reportsQuery.isLoading ||
    reportsQuery.isFetching ||
    reportsQuery.isFetchingNextPage;

  const selectedCellId = useMemo(() => heatQuery.data?.cells?.[0]?.id, [heatQuery.data?.cells]);
  const reportItems = reportsQuery.data?.pages.flatMap((page) => page.reports) ?? [];

  const handleSelectPlace = (place: PlaceItem) => {
    startTransition(() => {
      setFocusTarget({
        lng: place.lng,
        lat: place.lat,
        zoom: place.zoom,
        bounds:
          place.west !== undefined &&
          place.south !== undefined &&
          place.east !== undefined &&
          place.north !== undefined
            ? [place.west, place.south, place.east, place.north]
            : undefined,
      });
    });
  };

  const dismissOnboarding = () => {
    window.localStorage.setItem("hz-onboarding-complete", "1");
    document.cookie = "hz-onboarding-complete=1; Path=/; Max-Age=31536000; SameSite=Lax";
    setOnboardingOverride(true);
  };

  return (
    <main className="relative h-dvh overflow-hidden bg-[#05060a] text-slate-100">
      {queriesEnabled ? (
        <MapShell
          cells={heatQuery.data?.cells ?? []}
          selectedCellId={selectedCellId}
          focusTarget={focusTarget}
          onViewportIdle={setBounds}
        />
      ) : (
        <StaticMapBackdrop />
      )}

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_left,rgba(245,208,0,0.144),transparent_28%),radial-gradient(circle_at_top_right,rgba(95,232,255,0.112),transparent_32%),linear-gradient(180deg,rgba(10,16,24,0.04),rgba(10,16,24,0.16))]" />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 p-3 md:p-5">
        <div className="pointer-events-auto flex w-full items-center gap-2 md:max-w-[520px] md:gap-3">
          <BrandMark compact showTagline={false} className="shrink-0" />
          <div className="flex-1">
            <SearchBar disabled={onboardingOpen} onSelect={handleSelectPlace} />
          </div>
          {isDev ? (
            <IconButton label="Dev tools" onClick={() => setDevOpen(true)} className="shrink-0">⚙</IconButton>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[1.75rem] z-20 p-3 md:top-0 md:right-0 md:left-auto md:flex md:w-[520px] md:items-end md:p-5 md:pb-[4.5rem]">
        <div className="pointer-events-auto w-full md:h-full md:max-h-none">
          <ReportsPanel
            reports={reportItems}
            isLoading={isPanelLoading}
            hasMore={Boolean(reportsQuery.hasNextPage)}
            onSelectReport={setSelectedReportId}
            collapsed={reportsCollapsed}
            onToggleCollapse={() => setReportsCollapsed((c) => !c)}
            onLoadMore={() => {
              if (reportsQuery.hasNextPage && !reportsQuery.isFetchingNextPage) {
                void reportsQuery.fetchNextPage();
              }
            }}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="w-full border-t border-[var(--line)]/40 bg-[#06080e]/92 backdrop-blur-xl">
          <SiteFooter
            compact
            className="pointer-events-auto px-4 py-2 md:px-5 md:py-2.5"
          />
        </div>
      </div>

      {selectedReportId ? (
        <IncidentModal
          open
          publicId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      ) : null}

      <ModalShell
        open={onboardingOpen}
        title={appName}
        dismissible={false}
        onClose={() => undefined}
        footer={(
          <div className="space-y-3">
            <PrimaryButton onClick={dismissOnboarding}>
              Enter map
            </PrimaryButton>
            <div className="cyber-title flex flex-wrap items-center justify-center gap-3 text-[12px] text-slate-400">
              <Link className="cursor-pointer transition hover:text-[var(--accent)]" href="/how-it-works">How This Works</Link>
              <Link className="cursor-pointer transition hover:text-[var(--accent)]" href="/data-sources">Data Sources</Link>
              <Link className="cursor-pointer transition hover:text-[var(--accent)]" href="/privacy">Privacy Policy</Link>
              <Link className="cursor-pointer transition hover:text-[var(--accent)]" href="/about">About</Link>
            </div>
          </div>
        )}
      >
        <div className="space-y-5 text-base leading-7 text-slate-300">
          <div className="flex justify-center">
            <Image
              src="/euhz.svg"
              alt={appName}
              width={112}
              height={112}
              preload
              className="h-28 w-28 shrink-0 drop-shadow-[0_0_18px_rgba(245,208,0,0.4)]"
            />
          </div>
          <p className="text-slate-200">
            Read recent safety reports across Europe before you travel, relocate, or pass through an unfamiliar area. Three things to know first:
          </p>
          {onboardingPoints.map((point, index) => (
            <div key={point} className="flex gap-3">
              <span className="cyber-title text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </ModalShell>

      {isDev ? (
        <DevTools
          open={devOpen}
          onClose={() => setDevOpen(false)}
          onShowOnboarding={() => {
            window.localStorage.removeItem("hz-onboarding-complete");
            document.cookie = "hz-onboarding-complete=; Path=/; Max-Age=0; SameSite=Lax";
            setOnboardingOverride(false);
          }}
        />
      ) : null}

      <QueryErrorOverlay
        queries={[
          { label: "Heat map", state: heatQuery },
          { label: "Reports", state: reportsQuery },
        ]}
      />
    </main>
  );
}

function StaticMapBackdrop() {
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#121923]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(95,232,255,0.16),transparent_34%),radial-gradient(circle_at_24%_24%,rgba(245,208,0,0.18),transparent_28%),linear-gradient(135deg,#121923,#1c2633_54%,#141c27)]" />
      <div className="cyber-map-overlay pointer-events-none absolute inset-0 z-[1]" />
    </div>
  );
}
