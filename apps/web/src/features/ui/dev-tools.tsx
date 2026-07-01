"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { armDevFail } from "../api/client";
import { Eyebrow, PrimaryButton, SurfaceCard } from "./atoms";
import { ModalShell } from "./modal-shell";

type DevToolsProps = {
  open: boolean;
  onClose: () => void;
  onShowOnboarding?: () => void;
};

export function DevTools({ open, onClose, onShowOnboarding }: DevToolsProps) {
  const queryClient = useQueryClient();
  const [detonate, setDetonate] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (line: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 8));
  };

  if (detonate) {
    throw new Error("DevTools: simulated render crash");
  }

  return (
    <ModalShell open={open} title="Dev tools" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-base leading-7 text-slate-300">
          Local-only triggers for testing error boundaries, query states, and cache behavior.
        </p>

        <SurfaceCard className="space-y-3">
          <Eyebrow>Render errors</Eyebrow>
          <PrimaryButton onClick={() => setDetonate(true)}>Throw render error</PrimaryButton>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <Eyebrow>Query cache</Eyebrow>
          <div className="flex gap-3">
            <PrimaryButton
              onClick={() => {
                void queryClient.invalidateQueries();
                pushLog("Invalidated all queries");
              }}
              className="flex-1"
            >
              Invalidate all
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                queryClient.clear();
                pushLog("Cleared query cache");
              }}
              className="flex-1"
            >
              Clear cache
            </PrimaryButton>
          </div>
          <div className="flex gap-3">
            <PrimaryButton
              onClick={() => {
                void queryClient.refetchQueries({ type: "active" });
                pushLog("Refetched active queries");
              }}
              className="flex-1"
            >
              Refetch active
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                queryClient.setQueryData(["heat"], () => {
                  throw new Error("DevTools: corrupted heat cache");
                });
                pushLog("Poisoned heat cache");
              }}
              className="flex-1"
            >
              Poison heat cache
            </PrimaryButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <Eyebrow>Backend / DB</Eyebrow>
          <div className="flex gap-3">
            <PrimaryButton
              onClick={() => {
                armDevFail("500");
                void queryClient.invalidateQueries();
                pushLog("Armed 500 on next request");
              }}
              className="flex-1"
            >
              500 next req
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                armDevFail("503");
                void queryClient.invalidateQueries();
                pushLog("Armed 503 (DB down) on next request");
              }}
              className="flex-1"
            >
              503 DB down
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                armDevFail("network");
                void queryClient.invalidateQueries();
                pushLog("Armed network fail on next request");
              }}
              className="flex-1"
            >
              Network fail
            </PrimaryButton>
          </div>
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <Eyebrow>Page</Eyebrow>
          <div className="flex gap-3">
            <PrimaryButton
              onClick={() => {
                pushLog("Threw async error");
                void Promise.reject(new Error("DevTools: unhandled promise rejection"));
              }}
              className="flex-1"
            >
              Async reject
            </PrimaryButton>
            <PrimaryButton
              onClick={() => {
                window.location.reload();
              }}
              className="flex-1"
            >
              Reload page
            </PrimaryButton>
            {onShowOnboarding ? (
              <PrimaryButton onClick={onShowOnboarding} className="flex-1">
                Onboarding
              </PrimaryButton>
            ) : null}
          </div>
        </SurfaceCard>

        {log.length > 0 ? (
          <SurfaceCard className="space-y-2">
            <Eyebrow>Log</Eyebrow>
            <div className="cyber-mono space-y-1 text-xs text-slate-400">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </SurfaceCard>
        ) : null}
      </div>
    </ModalShell>
  );
}
