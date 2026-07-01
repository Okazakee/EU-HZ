import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-xs uppercase tracking-[0.18em] text-slate-500 ${className}`}>
      {children}
    </span>
  );
}

type PillTone = "slate" | "red" | "amber" | "orange" | "emerald";

const pillTone: Record<PillTone, string> = {
  slate: "bg-white/8 text-slate-200 hover:bg-white/14",
  red: "bg-red-700 text-white",
  amber: "bg-amber-500/18 text-amber-100",
  orange: "bg-orange-500/18 text-orange-100",
  emerald: "bg-emerald-500/18 text-emerald-100",
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
      className={`inline-flex items-center rounded-full ${sizing} ${resolved} ${interactive} ${className}`}
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
  const cls = `block w-full rounded-2xl bg-red-700 px-4 py-3 text-center text-sm font-medium text-white cursor-pointer hover:bg-red-600 ${className}`;
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
      className={`flex ${dims} items-center justify-center rounded-full bg-white/10 text-slate-200 cursor-pointer hover:bg-white/18 ${className}`}
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
    <div id={id} className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${className}`}>
      {children}
    </div>
  );
}
