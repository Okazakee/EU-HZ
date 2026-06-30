"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { useHeatQuery, useReportsQuery } from "@/features/api/queries";
import type { PlaceItem, ViewportBounds } from "@/features/api/types";
import { MapShell } from "@/features/map/map-shell";
import { SearchBar } from "@/features/map/search-bar";
import { IncidentModal } from "@/features/reports/incident-modal";
import { ReportsPanel } from "@/features/reports/reports-panel";
import { ModalShell } from "@/features/ui/modal-shell";
import { BrandMark } from "@/features/ui/brand-mark";
import { PrimaryButton, IconButton } from "@/features/ui/atoms";
import { DevTools } from "@/features/ui/dev-tools";
import { QueryErrorOverlay } from "@/features/ui/query-error-overlay";
import { SiteFooter } from "@/features/ui/site-footer";
import { appName, onboardingPoints } from "@/features/ui/site-content";

const isDev = process.env.NODE_ENV !== "production";

const defaultBounds: ViewportBounds = {
  west: -10,
  south: 35,
  east: 30,
  north: 60,
  zoom: 4.2,
};

const emptySubscribe = () => () => {};

export default function Home() {
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isNavigating, startTransition] = useTransition();
  const [bounds, setBounds] = useState(defaultBounds);
  const [focusTarget, setFocusTarget] = useState<{
    lng: number;
    lat: number;
    zoom: number;
    bounds?: [number, number, number, number];
  } | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [reportsCollapsed, setReportsCollapsed] = useState(false);

  const onboardingOpen =
    !hydrated || !(onboardingDismissed || window.localStorage.getItem("hz-onboarding-complete") === "1");
  const queriesEnabled = hydrated && !onboardingOpen;
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

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-950 text-slate-100">
      <MapShell
        cells={heatQuery.data?.cells ?? []}
        selectedCellId={selectedCellId}
        focusTarget={focusTarget}
        onViewportIdle={setBounds}
      />

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
        <div className="w-full border-t border-white/10 bg-slate-950/96">
          <SiteFooter
            compact
            className="pointer-events-auto px-4 py-2 md:px-5 md:py-2.5"
          />
        </div>
      </div>

      <IncidentModal
        open={Boolean(selectedReportId)}
        publicId={selectedReportId}
        onClose={() => setSelectedReportId(null)}
      />

      <ModalShell
        open={onboardingOpen}
        title={appName}
        dismissible={false}
        onClose={() => undefined}
        footer={(
          <div className="space-y-3">
            <PrimaryButton
              onClick={() => {
                window.localStorage.setItem("hz-onboarding-complete", "1");
                setOnboardingDismissed(true);
              }}
            >
              Enter map
            </PrimaryButton>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
              <Link className="cursor-pointer transition hover:text-slate-200" href="/how-it-works">How This Works</Link>
              <Link className="cursor-pointer transition hover:text-slate-200" href="/data-sources">Data Sources</Link>
              <Link className="cursor-pointer transition hover:text-slate-200" href="/privacy">Privacy Policy</Link>
              <Link className="cursor-pointer transition hover:text-slate-200" href="/about">About</Link>
            </div>
          </div>
        )}
      >
        <div className="space-y-4 text-sm leading-7 text-slate-300">
          <div className="flex justify-center pb-2">
            <BrandMark />
          </div>
          {onboardingPoints.map((point) => (
            <p key={point}>{point}</p>
          ))}
        </div>
      </ModalShell>

      {isDev ? (
        <DevTools
          open={devOpen}
          onClose={() => setDevOpen(false)}
          onShowOnboarding={() => {
            window.localStorage.removeItem("hz-onboarding-complete");
            setOnboardingDismissed(false);
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
