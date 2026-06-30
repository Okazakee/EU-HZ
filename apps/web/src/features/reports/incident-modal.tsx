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
        <div className="text-sm text-slate-400">Loading report...</div>
      ) : null}
      {incident ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {incident.eventType}
              </div>
              <h2 className="text-lg font-semibold leading-tight text-slate-50">
                {incident.title}
              </h2>
            </div>
            <Pill tone={statusTone[incident.status]}>{incident.status}</Pill>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span>{new Date(incident.occurredAt).toLocaleDateString("en-GB", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}</span>
            <span>{incident.location.label}</span>
            <span>{(incident.confidence * 100).toFixed(0)}% signal confidence</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm leading-7 text-slate-200">{incident.summary}</p>
          </div>

          {incident.evidence.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Original source{incident.evidence.length > 1 ? "s" : ""}
              </div>
              {incident.evidence.map((item) => (
                <div
                  key={`${item.url}-${item.publishedAt}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="truncate text-sm font-medium text-slate-100">
                    {item.sourceName}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {new Date(item.publishedAt).toLocaleDateString("en-GB")}
                  </div>
                  <div className="mt-3">
                    <PrimaryButton href={item.url}>View Source</PrimaryButton>
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
