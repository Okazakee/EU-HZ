"use client";

import { type ReactNode, useEffect } from "react";

import { IconButton } from "./atoms";

type ModalShellProps = {
  open: boolean;
  title: string | ReactNode;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  dismissible?: boolean;
};

export function ModalShell({ open, title, children, onClose, footer, dismissible = true }: ModalShellProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissible, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#030407]/78 p-4 backdrop-blur-sm">
      <div className="cyber-panel cyber-panel-strong cyber-cut-lg cyber-scanlines w-full max-w-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)]/35 px-5 py-4">
          <h2 className="cyber-title text-lg font-semibold text-[var(--accent)]">{title}</h2>
          {dismissible ? (
            <IconButton label="Close" onClick={onClose}>x</IconButton>
          ) : null}
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-[var(--line)]/35 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
