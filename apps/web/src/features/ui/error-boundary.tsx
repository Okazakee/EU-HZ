"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { ModalShell } from "./modal-shell";
import { PrimaryButton, SurfaceCard } from "./atoms";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Fatal error captured:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = () => {
    const { error } = this.state;
    if (!error) {
      return;
    }
    void navigator.clipboard.writeText(`${error.name}: ${error.message}\n${error.stack ?? ""}`);
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <ModalShell open={true} title="Something broke" dismissible={false} onClose={() => undefined}>
          <div className="space-y-5">
            <p className="text-base leading-7 text-slate-300">
              The app hit an unrecoverable error. Reload the page to retry. If it keeps happening, copy the details below and report it.
            </p>
            <SurfaceCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Error</div>
              <div className="text-sm text-red-200">{error.name}: {error.message}</div>
              {error.stack ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{error.stack}</pre>
              ) : null}
            </SurfaceCard>
            <div className="flex gap-3">
              <PrimaryButton onClick={this.handleReload} className="flex-1">Reload</PrimaryButton>
              <PrimaryButton onClick={this.handleCopy} className="flex-1">Copy details</PrimaryButton>
            </div>
          </div>
        </ModalShell>
      </div>
    );
  }
}
