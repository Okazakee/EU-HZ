"use client";

import { useEffect, useRef } from "react";

import type { ReportItem } from "../api/types";
import { Eyebrow, Pill, SurfaceCard } from "../ui/atoms";

type ReportsPanelProps = {
  reports: ReportItem[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectReport: (publicId: string) => void;
};

const statusTone: Record<ReportItem["status"], "amber" | "orange" | "emerald"> = {
  unverified: "amber",
  corroborated: "orange",
  verified: "emerald",
};

const eventStyle: Record<string, { shell: string; badge: string }> = {
  murder: { shell: "from-red-950/98 via-slate-950 to-slate-950", badge: "text-red-300/22" },
  harassment: { shell: "from-pink-950/98 via-slate-950 to-slate-950", badge: "text-pink-300/22" },
  assault: { shell: "from-red-950/98 via-slate-950 to-slate-950", badge: "text-red-300/22" },
  robbery: { shell: "from-amber-950/98 via-slate-950 to-slate-950", badge: "text-amber-300/22" },
  violence: { shell: "from-violet-950/98 via-slate-950 to-slate-950", badge: "text-violet-300/22" },
};

function EventGlyph({ type }: { type: string }) {
  const common = "stroke-current";
  switch (type) {
    case "murder":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path d="M40 8L20 28L26 34L46 14L40 8Z" strokeWidth="3" strokeLinejoin="round" />
          <rect x="17" y="30" width="10" height="22" rx="3" transform="rotate(45 22 41)" strokeWidth="3" />
          <path d="M22 52C20 55 18 56 16 56" strokeWidth="3" strokeLinecap="round" />
          <circle cx="18" cy="55" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "harassment":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path d="M20 30V18a4 4 0 0 1 8 0V28M28 28V14a4 4 0 0 1 8 0V28M36 28V18a4 4 0 0 1 8 0V30M20 28L16 36a8 8 0 0 0 8 10h12a8 8 0 0 0 8-8V30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12L52 52" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "assault":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path d="M22 36C22 30 22 24 28 24C34 24 34 30 34 36V40H22V36Z" strokeWidth="3" strokeLinejoin="round" />
          <path d="M34 36C36 30 40 28 44 30C48 32 46 38 44 42L40 48H34" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 40L18 46L22 50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "robbery":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path d="M24 20L28 12H36L40 20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 20H46L50 32C52 40 50 48 46 52H18C14 48 12 40 14 32L18 20Z" strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 30V44M28 34C28 31 30 30 32 30C34 30 36 31 36 34C36 37 32 38 32 38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path d="M32 6L38 24L58 26L42 38L48 58L32 46L16 58L22 38L6 26L26 24L32 6Z" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function ReportsPanel({ reports, isLoading, hasMore, onLoadMore, onSelectReport }: ReportsPanelProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        onLoadMore();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore]);

  return (
    <section className="flex max-h-[42vh] flex-col rounded-[28px_28px_0_0] border border-white/10 bg-slate-950/90 p-4 text-slate-100 shadow-[0_30px_90px_rgba(2,6,23,0.5)] backdrop-blur md:h-full md:max-h-none md:rounded-[32px]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Travel awareness</h2>
          <p className="mt-1 text-sm text-slate-400">Recent reports inside the visible map area.</p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
            isLoading
              ? "border-red-500/30 bg-red-500/10 text-red-100"
              : "border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isLoading ? "animate-pulse bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.8)]" : "bg-emerald-400"
            }`}
          />
          <span>{isLoading ? "Loading data" : "Live data"}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {reports.length === 0 ? (
          <SurfaceCard className="border-dashed border-white/14 p-6 text-sm text-slate-400">
            No recent reports were found in this view. Zoom out or search another country or city.
          </SurfaceCard>
        ) : null}

        {reports.map((report) => (
          <ReportCard key={report.publicId} report={report} onOpen={() => onSelectReport(report.publicId)} />
        ))}
        {hasMore ? (
          <SurfaceCard
            className="border-dashed border-white/14 p-4 text-center text-sm text-slate-400"
          >
            <div ref={loadMoreRef}>Loading more reports...</div>
          </SurfaceCard>
        ) : null}
      </div>
    </section>
  );
}

function ReportCard({ report, onOpen }: { report: ReportItem; onOpen: () => void }) {
  const tone = eventStyle[report.eventType] ?? eventStyle.violence;

  return (
    <button
      className={`relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${tone.shell} p-4 text-left shadow-sm cursor-pointer`}
      onClick={onOpen}
      type="button"
    >
      <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${tone.badge} opacity-60`}>
        <div className="h-32 w-32">
          <EventGlyph type={report.eventType} />
        </div>
      </div>
      <div className="relative flex h-full flex-col justify-between">
        <div className="space-y-2 pr-24">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-50">{report.title}</h3>
          <div className="truncate text-sm text-slate-200">{report.locationLabel}</div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
          <span>{new Date(report.occurredAt).toLocaleDateString()}</span>
        </div>
      </div>
      <Eyebrow className="absolute top-3 right-3 z-10 text-slate-400">{report.eventType}</Eyebrow>
      <Pill tone={statusTone[report.status]} className="absolute bottom-3 right-3 z-10">{report.status}</Pill>
    </button>
  );
}
