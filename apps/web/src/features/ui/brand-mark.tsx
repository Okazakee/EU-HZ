import Image from "next/image";

import { Eyebrow } from "./atoms";
import { appName, appTagline } from "./site-content";

type BrandMarkProps = {
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, showTagline = true, className = "" }: BrandMarkProps) {
  return (
    <div className={`cyber-panel cyber-cut flex items-center gap-3 px-3 py-2 ${className}`}>
      <Image
        src="/euhz.svg"
        alt={appName}
        width={compact ? 32 : 56}
        height={compact ? 32 : 56}
        className={compact ? "h-8 w-8 shrink-0" : "h-14 w-14 shrink-0"}
      />
      <div className="min-w-0">
        <div className={compact ? "cyber-title text-sm font-semibold text-[var(--accent)]" : "cyber-title text-lg font-semibold text-[var(--accent)]"}>
          {appName}
        </div>
        {showTagline ? (
          <Eyebrow className="mt-0.5 block text-[11px] text-slate-300">{appTagline}</Eyebrow>
        ) : null}
      </div>
    </div>
  );
}
