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
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/euhz.svg"
        alt={appName}
        width={compact ? 32 : 56}
        height={compact ? 32 : 56}
        className={compact ? "h-8 w-8 shrink-0" : "h-14 w-14 shrink-0"}
      />
      <div className="min-w-0">
        <div className={compact ? "text-sm font-semibold text-slate-50" : "text-lg font-semibold text-slate-50"}>
          {appName}
        </div>
        {showTagline ? (
          <Eyebrow className="mt-0.5 block text-[10px] text-slate-400">{appTagline}</Eyebrow>
        ) : null}
      </div>
    </div>
  );
}
