import Link from "next/link";

import { Eyebrow } from "./atoms";
import { appName, appVersion, footerLinks } from "./site-content";

type SiteFooterProps = {
  className?: string;
  compact?: boolean;
};

export function SiteFooter({ className = "", compact = false }: SiteFooterProps) {
  return (
    <footer className={`${compact ? "" : "border-t border-white/8 pt-4"} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <div className="text-sm font-semibold text-slate-100">{appName}</div>
          <Eyebrow className="mt-0.5 block text-[10px] text-slate-500">v{appVersion}</Eyebrow>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="cursor-pointer transition hover:text-slate-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
