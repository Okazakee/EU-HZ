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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
          <path d="M32 8L38 32L32 38L26 32Z" strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 34H44" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 38V52" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="56" r="3" strokeWidth="3" />
        </svg>
      );
    case "harassment":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path
            d="M14 16h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H24l-8 8v-8h-2a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z"
            strokeWidth="3"
            strokeLinejoin="round"
            opacity="0.35"
          />
          <path
            d="M26 26h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-2v8l-8-8H26a4 4 0 0 1-4-4V30a4 4 0 0 1 4-4Z"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M38 34v6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="38" cy="44" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "assault":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path
            d="M20 26a4 4 0 0 1 8 0v2M28 24a4 4 0 0 1 8 0v4M36 24a4 4 0 0 1 8 0v4"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M18 28v8c0 10 8 18 18 18s18-8 18-18v-4"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M18 32c-4 0-6 3-6 6s2 6 6 6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M46 14l4-4M50 20h6M46 26l4 3" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "robbery":
      return (
        <svg viewBox="0 0 64 64" fill="none" className={common}>
          <path
            d="M32 10c-10 0-16 8-16 18v10c0 4 2 6 4 6h24c2 0 4-2 4-6V28c0-10-6-18-16-18Z"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="25" cy="30" rx="4" ry="3" strokeWidth="3" />
          <ellipse cx="39" cy="30" rx="4" ry="3" strokeWidth="3" />
          <path d="M20 40h24" strokeWidth="3" strokeLinecap="round" />
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

export function ReportsPanel({ reports, isLoading, hasMore, onLoadMore, onSelectReport, collapsed = false, onToggleCollapse }: ReportsPanelProps) {
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

  const HeaderTag = onToggleCollapse ? "button" : "div";
  const headerProps = onToggleCollapse
    ? { type: "button" as const, onClick: onToggleCollapse, className: "mb-4 flex w-full items-start justify-between gap-4 text-left md:cursor-default" }
    : { className: "mb-4 flex items-start justify-between gap-4" };

  return (
    <section
      className={`cyber-panel cyber-panel-strong cyber-cut cyber-scanlines flex flex-col p-4 text-slate-100 transition-[max-height] duration-300 ease-in-out md:h-full md:max-h-none ${
        collapsed ? "max-h-[5rem] overflow-hidden md:max-h-none" : "max-h-[38vh] md:max-h-none"
      }`}
    >
      <HeaderTag {...headerProps}>
        <div className="min-w-0 flex-1">
          <h2 className="cyber-title text-[1.35rem] font-semibold text-[var(--accent)]">Travel awareness</h2>
          <p className="mt-1 truncate text-sm text-slate-400">Recent reports inside the visible map area.</p>
        </div>
        <div
          className={`cyber-cut cyber-title inline-flex shrink-0 items-center gap-2 border px-3 py-2 text-[11px] font-semibold ${
            isLoading
              ? "border-[#ff623d]/40 bg-[#29120d]/90 text-[#ff8f74]"
              : "border-[var(--line-soft)] bg-[#0b1320]/90 text-[var(--accent-alt)]"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isLoading ? "animate-pulse bg-[#ff623d] shadow-[0_0_14px_rgba(255,98,61,0.8)]" : "bg-[var(--accent)] shadow-[0_0_14px_rgba(245,208,0,0.7)]"
            }`}
          />
          <span className="hidden sm:inline">{isLoading ? "Loading data" : "Live data"}</span>
          <span className="sm:hidden">{isLoading ? "···" : "Live"}</span>
        </div>
        {onToggleCollapse ? (
          <span className="ml-1 shrink-0 text-lg leading-none text-slate-400 md:hidden" aria-hidden>
            {collapsed ? "▴" : "▾"}
          </span>
        ) : null}
      </HeaderTag>

      <div className="cyber-scrollbar flex-1 overflow-y-auto">
        <div className="space-y-3 pr-3">
          {reports.length === 0 ? (
            <SurfaceCard className="border border-dashed border-[var(--line)]/40 p-6 text-sm text-slate-400">
              No recent reports were found in this view. Zoom out or search another country or city.
            </SurfaceCard>
          ) : null}

          {reports.map((report) => (
            <ReportCard key={report.publicId} report={report} onOpen={() => onSelectReport(report.publicId)} />
          ))}
          {hasMore ? (
            <SurfaceCard
              className="border border-dashed border-[var(--line)]/40 p-4 text-center text-sm text-slate-400"
            >
              <div ref={loadMoreRef}>Loading more reports...</div>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReportCard({ report, onOpen }: { report: ReportItem; onOpen: () => void }) {
  const tone = eventStyle[report.eventType] ?? eventStyle.violence;

  return (
    <button
      className={`cyber-cut relative aspect-[3/1] w-full cursor-pointer overflow-hidden border border-[var(--line)]/40 bg-gradient-to-br ${tone.shell} p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.34)] md:aspect-video md:p-4`}
      onClick={onOpen}
      type="button"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(245,208,0,0.1),transparent_34%),linear-gradient(315deg,rgba(95,232,255,0.08),transparent_32%)]" />
      <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${tone.badge} opacity-60`}>
        <div className="h-20 w-20 md:h-32 md:w-32">
          <EventGlyph type={report.eventType} />
        </div>
      </div>
      <div className="relative flex h-full flex-col justify-between">
        <div className="space-y-2 pr-24">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-50">{report.title}</h3>
          <div className="cyber-title truncate text-[11px] text-[var(--accent-alt)]">{report.locationLabel}</div>
        </div>
        <div className="cyber-mono mt-1 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-400 md:mt-3">
          <span>{new Date(report.occurredAt).toLocaleDateString("en-GB")}</span>
        </div>
      </div>
      <Eyebrow className="absolute top-3 right-3 z-10 text-[var(--accent)]">{report.eventType}</Eyebrow>
      <Pill tone={statusTone[report.status]} className="absolute bottom-3 right-3 z-10">{report.status}</Pill>
    </button>
  );
}
