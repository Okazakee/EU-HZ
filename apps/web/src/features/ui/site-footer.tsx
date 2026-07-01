import Link from "next/link";

import { Eyebrow } from "./atoms";
import { appName, appVersion, footerLinks } from "./site-content";

type SiteFooterProps = {
  className?: string;
  compact?: boolean;
};

export function SiteFooter({ className = "", compact = false }: SiteFooterProps) {
  return (
    <footer className={`${compact ? "" : "border-t border-[var(--line)]/30 pt-4"} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="hidden md:block">
          <div className="cyber-title text-sm font-semibold text-[var(--accent)]">{appName}</div>
          <Eyebrow className="mt-0.5 block text-[11px] text-slate-400">v{appVersion}</Eyebrow>
        </div>
        <nav className="cyber-title flex flex-nowrap items-center gap-3 overflow-x-auto whitespace-nowrap text-[12px] text-slate-400 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="cursor-pointer transition hover:text-[var(--accent)]">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
