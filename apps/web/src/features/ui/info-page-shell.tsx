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
    <main className="min-h-screen bg-[#05060a] px-4 py-6 text-slate-100 md:px-6 md:py-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,208,0,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(95,232,255,0.12),transparent_30%)]" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <BrandMark />
          <div className="w-full max-w-[220px]">
            <PrimaryButton href="/" className="!text-slate-900">Back to map</PrimaryButton>
          </div>
        </div>

        <section className="cyber-panel cyber-panel-strong cyber-cut-lg cyber-scanlines relative p-5 md:p-8">
          <Eyebrow className="block text-slate-300">{eyebrow}</Eyebrow>
          <h1 className="cyber-title mt-3 text-3xl font-semibold tracking-tight text-[var(--accent)] md:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">{intro}</p>
          <div className="mt-8 space-y-5">{children}</div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
