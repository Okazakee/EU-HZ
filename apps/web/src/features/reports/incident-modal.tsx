"use client";

import { useIncidentQuery } from "../api/queries";
import { Pill, PrimaryButton } from "../ui/atoms";
import { ModalShell } from "../ui/modal-shell";

const statusTone: Record<string, "amber" | "orange" | "emerald"> = {
  unverified: "amber",
  corroborated: "orange",
  verified: "emerald",
};

type IncidentModalProps = {
  publicId: string | null;
  open: boolean;
  onClose: () => void;
};

export function IncidentModal({ publicId, open, onClose }: IncidentModalProps) {
  const incidentQuery = useIncidentQuery(publicId, open);
  const incident = incidentQuery.data;

  return (
    <ModalShell open={open} title="Report details" onClose={onClose}>
      {incidentQuery.isLoading ? (
        <div className="cyber-title text-sm text-[var(--accent-alt)]">Loading report...</div>
      ) : null}
      {incident ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="cyber-title text-xs text-[var(--accent-alt)]/80">
                {incident.eventType}
              </div>
              <h2 className="cyber-title text-xl font-semibold leading-tight text-slate-50">
                {incident.title}
              </h2>
            </div>
            <Pill tone={statusTone[incident.status]}>{incident.status}</Pill>
          </div>

          <div className="cyber-mono flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>{new Date(incident.occurredAt).toLocaleDateString("en-GB", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}</span>
            <span>{incident.location.label}</span>
            <span>{(incident.confidence * 100).toFixed(0)}% signal confidence</span>
          </div>

          <div className="cyber-panel cyber-cut p-4">
            <p className="text-base leading-7 text-slate-200">{incident.summary}</p>
          </div>

          {incident.evidence.length > 0 ? (
            <div className="space-y-3">
              <div className="cyber-title text-xs text-[var(--accent-alt)]/80">
                Original source{incident.evidence.length > 1 ? "s" : ""}
              </div>
              {incident.evidence.map((item) => (
                <div
                  key={`${item.url}-${item.publishedAt}`}
                  className="cyber-panel cyber-cut p-4"
                >
                  <div className="cyber-title truncate text-sm font-semibold text-slate-100">
                    {item.sourceName}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                    {item.title}
                  </div>
                  <div className="cyber-mono mt-1 text-xs text-slate-500">
                    {new Date(item.publishedAt).toLocaleDateString("en-GB")}
                  </div>
                  <div className="mt-3">
                    <PrimaryButton href={item.url} className="!text-slate-900">View Source</PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}
