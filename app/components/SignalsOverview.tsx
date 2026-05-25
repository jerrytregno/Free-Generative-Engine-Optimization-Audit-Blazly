"use client";

import type { ParsedSignals } from "./ParsedSignals";
import { formatAbsent } from "./ParsedSignals";

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </h4>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InlineLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-slate-400">{children}</span>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const empty = value === "Not set";
  return (
    <div className="space-y-1.5">
      <InlineLabel>{label}</InlineLabel>
      <p
        className={`text-[15px] leading-relaxed text-slate-800 ${empty ? "italic text-slate-400" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export function SignalsOverview({ s }: { s: ParsedSignals }) {
  const imgAltPct =
    s.imagesTotal > 0
      ? Math.round(
          ((s.imagesTotal - s.imagesMissingAlt) / s.imagesTotal) * 100,
        )
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section label="Search snippets (titles & descriptions)">
        <div className="space-y-5">
          <TextBlock label="Page title (browser & SERP headline)" value={formatAbsent(s.title)} />
          <TextBlock
            label="Meta description (SERP snippet source)"
            value={formatAbsent(s.metaDescription)}
          />
        </div>
      </Section>

      <Section label="On-page structure & depth">
        <div className="space-y-4">
          <InlineLabel>Primary headings (H1)</InlineLabel>
          {s.h1.length ? (
            <ul className="flex flex-wrap gap-2">
              {s.h1.map((h, i) => (
                <li
                  key={i}
                  className="max-w-full rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium leading-snug text-orange-950 ring-1 ring-orange-100"
                >
                  {h.length > 120 ? `${h.slice(0, 120)}…` : h}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-slate-400">None detected</p>
          )}
          <div className="flex flex-wrap gap-6 rounded-xl bg-white/70 p-4 ring-1 ring-slate-100">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Section breaks
              </span>
              <p className="mt-1 font-semibold tabular-nums text-slate-900">
                {s.h2Count}{" "}
                <span className="font-normal text-slate-600">subheadings</span>
                <span className="text-sm font-normal text-slate-500"> (h2)</span>
              </p>
            </div>
            <div className="h-auto w-px bg-slate-200" aria-hidden />
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Visible words
              </span>
              <p className="mt-1 font-semibold tabular-nums text-slate-900">
                {s.wordCount.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Estimated from stripped body text — copy depth heuristic.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section label="Imagery & alt descriptions">
        <div className="rounded-xl bg-white/70 p-4 ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {s.imagesTotal.toLocaleString()}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Inline images analysed
              </p>
            </div>
            {imgAltPct !== null ? (
              <div className="text-right">
                <p
                  className={`text-2xl font-semibold tabular-nums ${imgAltPct === 100 ? "text-emerald-700" : imgAltPct >= 70 ? "text-amber-700" : "text-rose-700"}`}
                >
                  {imgAltPct}%
                </p>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Include alt copy
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-slate-500">No images on page</p>
            )}
          </div>
          {s.imagesTotal > 0 ? (
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${
                  imgAltPct === 100
                    ? "bg-emerald-500"
                    : imgAltPct !== null && imgAltPct >= 70
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{
                  width: `${imgAltPct ?? 0}%`,
                }}
              />
            </div>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Alt attributes describe visuals for accessibility and richer context beside the prose.
          </p>
        </div>
      </Section>
    </div>
  );
}
