import type { ReactNode } from "react";

import { BrandMark } from "./brand-mark";
import { Eyebrow, PrimaryButton } from "./atoms";
import { SiteFooter } from "./site-footer";

type InfoPageShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export function InfoPageShell({ eyebrow, title, intro, children }: InfoPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <BrandMark />
          <div className="w-full max-w-[220px]">
            <PrimaryButton href="/">Back to map</PrimaryButton>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_90px_rgba(2,6,23,0.5)] md:p-8">
          <Eyebrow className="block text-slate-400">{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">{intro}</p>
          <div className="mt-8 space-y-5">{children}</div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
