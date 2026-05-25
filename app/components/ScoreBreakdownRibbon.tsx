"use client";

import type { ContentScoreBreakdown } from "@/lib/seo-score";

const GROUPS: {
  label: string;
  max: number;
  key: keyof Omit<ContentScoreBreakdown, "total">;
}[] = [
  { label: "Title tag vs ideal length & presence", max: 15, key: "title" },
  { label: "Meta description quality", max: 15, key: "metaDescription" },
  { label: "H1 clarity & subsection headings (h2)", max: 15, key: "headings" },
  { label: "Images & alt completeness", max: 10, key: "images" },
];

export function ScoreBreakdownRibbon({ score }: { score: ContentScoreBreakdown }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Score breakdown · content cues only
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Bars show how close each copy + structure pillar is to the maximum points in this simplified rubric.
        </p>
      </div>
      <div className="mt-6 space-y-5">
        {GROUPS.map((g) => {
          const pts = score[g.key];
          const pct = Math.round((pts / g.max) * 100);
          const barTone =
            pct >= 85
              ? "bg-emerald-500"
              : pct >= 55
                ? "bg-amber-500"
                : "bg-rose-400";
          return (
            <div key={g.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{g.label}</span>
                <span className="font-mono text-xs font-semibold text-slate-500">
                  <span className="text-slate-900">{pts}</span> / {g.max}
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barTone}`}
                  style={{
                    width: `${Math.min(100, pct)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
