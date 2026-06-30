"use client";

import { PrimaryButton, SurfaceCard, Eyebrow } from "./atoms";
import { ModalShell } from "./modal-shell";

type QueryStateLite = {
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

type QueryErrorOverlayProps = {
  queries: Array<{ label: string; state: QueryStateLite }>;
};

export function QueryErrorOverlay({ queries }: QueryErrorOverlayProps) {
  const failed = queries.find((q) => q.state.isError);
  if (!failed) {
    return null;
  }
  const error = failed.state.error as Error;

  return (
    <ModalShell
      open={true}
      title="Backend unreachable"
      dismissible={false}
      onClose={() => undefined}
      footer={(
        <PrimaryButton onClick={() => void failed.state.refetch()}>Retry</PrimaryButton>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm leading-7 text-slate-300">
          The backend or database appears to be down. The app cannot load fresh data. Retry to reconnect — the map will recover automatically once the service is back.
        </p>
        <SurfaceCard className="space-y-2">
          <Eyebrow>{failed.label}</Eyebrow>
          <div className="text-sm text-red-200">{error.message}</div>
        </SurfaceCard>
      </div>
    </ModalShell>
  );
}
