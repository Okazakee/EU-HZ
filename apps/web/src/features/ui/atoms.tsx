import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`cyber-title text-[12px] font-semibold tracking-[0.24em] text-[var(--accent-alt)]/85 ${className}`}>
      {children}
    </span>
  );
}

type PillTone = "slate" | "red" | "amber" | "orange" | "emerald";

const pillTone: Record<PillTone, string> = {
  slate: "border-[var(--line-soft)] bg-[#101726]/90 text-slate-100 hover:bg-[#161f31]",
  red: "border-[#ff623d]/50 bg-[#31130d]/95 text-[#ff8d72]",
  amber: "border-[var(--line)] bg-[#231f05]/95 text-[#ffe46d]",
  orange: "border-[#ff8c42]/45 bg-[#29170a]/95 text-[#ffb574]",
  emerald: "border-[#6bffb0]/38 bg-[#0f241d]/95 text-[#94ffc5]",
};

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  size?: "sm" | "md";
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Pill({ children, tone = "slate", size = "sm", active, onClick, className = "" }: PillProps) {
  const sizing = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs font-semibold";
  const resolved = active ? pillTone.red : pillTone[tone];
  const interactive = onClick ? "cursor-pointer" : "";
  return (
    <span
      className={`cyber-cut cyber-title inline-flex items-center border ${sizing} ${resolved} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </span>
  );
}

type PrimaryButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  className?: string;
};

export function PrimaryButton({ children, onClick, href, type = "button", className = "" }: PrimaryButtonProps) {
  const cls = `cyber-cut cyber-title cyber-glow block w-full cursor-pointer border border-[var(--line)] bg-[linear-gradient(90deg,rgba(245,208,0,0.96),rgba(255,145,0,0.92))] px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:brightness-105 ${className}`;
  if (href) {
    if (href.startsWith("/")) {
      return (
        <Link className={cls} href={href}>
          {children}
        </Link>
      );
    }
    return (
      <a className={cls} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <button className={cls} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

type IconButtonProps = {
  label: string;
  children: ReactNode;
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
};

export function IconButton({ label, children, onClick, size = "md", className = "" }: IconButtonProps) {
  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <button
      aria-label={label}
      className={`cyber-cut flex ${dims} cursor-pointer items-center justify-center border border-[var(--line-soft)] bg-[#0b1320]/88 text-[var(--accent-alt)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)] ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function SurfaceCard({ children, className = "", id }: SurfaceCardProps) {
  return (
    <div id={id} className={`cyber-panel cyber-cut cyber-scanlines p-4 ${className}`}>
      {children}
    </div>
  );
}
