"use client";

import { useMemo, useState } from "react";
import { parseSignals } from "@/app/components/ParsedSignals";
import { SignalsOverview } from "@/app/components/SignalsOverview";
import { ScoreBreakdownRibbon } from "@/app/components/ScoreBreakdownRibbon";
import type { ContentScoreBreakdown } from "@/lib/seo-score";

type FindingSeverity = "critical" | "warning" | "notice";

type OnPageFinding = {
  category: string;
  severity: FindingSeverity;
  detail: string;
  recommendation: string;
};

type PageRow = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  score: ContentScoreBreakdown;
  signals: Record<string, unknown>;
  analysis: {
    positives: string[];
    findings: OnPageFinding[];
  };
};

type AuditResponse = {
  lead?: { email: string };
  discovery?: {
    origin: string;
    sitemapSeeds: string[];
    discoveredUrls: number;
    analyzedUrls: number;
  };
  pages?: PageRow[];
  geoGemini?:
    | {
        status: "ok";
        referenced: boolean;
        prompts: Array<{ prompt: string; rationale: string }>;
        summary: string;
      }
    | { status: "skipped"; message: string }
    | { status: "error"; message: string };
  error?: string;
  details?: unknown;
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (score >= 55) return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-rose-700 bg-rose-50 border-rose-100";
}

function severityStyles(s: FindingSeverity): string {
  if (s === "critical") {
    return "border-l-4 border-l-rose-500 border border-slate-100 bg-white shadow-sm";
  }
  if (s === "warning") {
    return "border-l-4 border-l-amber-500 border border-slate-100 bg-white shadow-sm";
  }
  return "border-l-4 border-l-slate-300 border border-slate-100 bg-white shadow-sm";
}

function aggregatePagesContentScore(pages: PageRow[]): {
  average: number;
  min: number;
  max: number;
  total: number;
  loadedOk: number;
} {
  const scores = pages.map((p) => p.score.total);
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
  const loadedOk = pages.filter((p) => p.httpStatus >= 200 && p.httpStatus < 400).length;
  return {
    average: Math.round(avg),
    min: scores.length ? Math.min(...scores) : 0,
    max: scores.length ? Math.max(...scores) : 0,
    total: pages.length,
    loadedOk,
  };
}

function HttpBadge({ code }: { code: number }) {
  if (!code || code <= 0) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
        Fetch failed
      </span>
    );
  }
  if (code >= 200 && code < 400) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
        HTTP {code}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-rose-200/80">
      HTTP {code}
    </span>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);

  const aggregated = useMemo(() => {
    if (!result?.pages?.length) return null;
    return aggregatePagesContentScore(result.pages);
  }, [result?.pages]);

  const canSubmit = useMemo(
    () => email.includes("@") && websiteUrl.trim().length > 3,
    [email, websiteUrl],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          websiteUrl: websiteUrl.trim(),
        }),
      });
      const data = (await res.json()) as AuditResponse;
      if (!res.ok) {
        setResult({ error: data.error ?? "Audit failed.", details: data.details });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ error: "Network error talking to /api/audit." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-11 px-4 py-14 sm:px-7 lg:gap-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
            Blazly
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            SEO & GEO audit
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Get your SEO and GEO score for free
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl shadow-xl shadow-orange-500/[0.12] ring-1 ring-orange-500/15">
        <div className="bg-white px-6 py-8 sm:px-9 sm:py-9">
          <form
            className="grid gap-6 md:grid-cols-12 md:items-end"
            onSubmit={onSubmit}
          >
            <div className="md:col-span-5">
              <label className="text-sm font-medium text-slate-700">
                Work email
              </label>
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="growth@brand.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 shadow-inner outline-none ring-orange-400/30 transition focus:border-orange-400 focus:bg-white focus:ring-[3px]"
              />
            </div>
            <div className="md:col-span-5">
              <label className="text-sm font-medium text-slate-700">
                Website URL
              </label>
              <input
                type="text"
                required
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://brand.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 shadow-inner outline-none ring-orange-400/30 transition focus:border-orange-400 focus:bg-white focus:ring-[3px]"
              />
            </div>
            <div className="md:col-span-2">
              <button
                disabled={!canSubmit || loading}
                type="submit"
                className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/35 transition hover:brightness-[1.05] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Auditing…" : "Run audit"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {result?.error ? (
        <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white px-6 py-4 text-sm text-rose-900 shadow-sm">
          <strong className="font-semibold">Audit stopped.</strong> {result.error}
        </div>
      ) : null}

      {result && aggregated && result.discovery ? (
        <OverallCombinedScoreCard
          stats={aggregated}
          discovery={result.discovery}
        />
      ) : result?.discovery ? (
        <section className="flex flex-wrap items-stretch gap-4 rounded-3xl border border-slate-100 bg-white p-2 shadow-[0_2px_20px_-4px_rgb(15_23_42/0.08)]">
          <div className="min-w-[220px] flex-1 rounded-2xl bg-slate-900 px-7 py-6 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
              Crawl origin
            </p>
            <p className="mt-2 break-all font-mono text-[13px] leading-snug opacity-95">
              {result.discovery.origin}
            </p>
          </div>
          <div className="grid min-h-[112px] min-w-[200px] flex-[0.85] gap-px overflow-hidden rounded-2xl bg-slate-100 sm:grid-cols-2 lg:flex-initial lg:grid-cols-2">
            <StatCell label="URLs in sitemaps" value={result.discovery.discoveredUrls} />
            <StatCell label="Pages analyzed" value={result.discovery.analyzedUrls} />
          </div>
        </section>
      ) : null}

      {result?.geoGemini && !result.error ? (
        <GeminiGeoPanel geo={result.geoGemini} />
      ) : null}

      {result?.pages?.length ? (
        <details className="group rounded-3xl border border-slate-200 bg-white shadow-md shadow-slate-200/55 ring-1 ring-slate-100 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-6 py-5 sm:px-8 lg:py-6 transition-colors hover:bg-slate-50/90">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                View detailed results · by URL
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Opens {result.pages.length} full page audits (snippets, structure, imagery, breakdowns).
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:inline">
                Click to expand
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7 shrink-0 text-slate-500 transition-transform duration-300 ease-out group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </summary>
          <div className="border-t border-slate-100 bg-slate-50/35 px-4 py-10 sm:px-6 lg:px-10">
            <div className="mx-auto flex max-w-5xl flex-col gap-10">
              {result.pages.map((page, idx) => (
                <PageResultCard key={`${page.url}-${idx}`} page={page} />
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </main>
  );
}

function GeminiGeoPanel({
  geo,
}: {
  geo: NonNullable<AuditResponse["geoGemini"]>;
}) {
  return (
    <section className="rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-white to-slate-50/50 p-8 shadow-[0_8px_32px_-20px_rgb(91_33_182/0.25)] ring-1 ring-violet-100">
      <h2 className="text-lg font-semibold tracking-tight text-violet-950 sm:text-xl">
        GEO · generic prompts
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-violet-800/85">
        Simulated reasoning only — one model pass per audit, parallel to crawl. Does not mirror live search or chat logs.
      </p>
      {geo.status === "skipped" ? (
        <p className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {geo.message}
        </p>
      ) : geo.status === "error" ? (
        <p className="mt-4 rounded-xl border border-rose-200/90 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          {geo.message}
        </p>
      ) : geo.referenced ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-violet-900">
            LLMs mention you for these prompts.
          </p>
          <ul className="space-y-3">
            {geo.prompts.map((item, idx) => (
              <li
                key={idx}
                className="rounded-2xl border border-violet-200/70 bg-white/90 px-4 py-4 shadow-sm"
              >
                <p className="font-mono text-[13px] font-semibold text-slate-900">
                  {item.prompt}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {item.rationale}
                </p>
              </li>
            ))}
          </ul>
          {geo.summary ? (
            <p className="text-xs leading-relaxed text-slate-600">{geo.summary}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          <p className="text-base font-semibold text-violet-950">
            Not showing for any prompts
          </p>
          {geo.summary ? (
            <p className="text-sm leading-relaxed text-slate-600">{geo.summary}</p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">
              For the generic intents we tested, LLMs would not plausibly reference this URL or brand unless the user names it.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function OverallCombinedScoreCard({
  stats,
  discovery,
}: {
  stats: ReturnType<typeof aggregatePagesContentScore>;
  discovery: NonNullable<AuditResponse["discovery"]>;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/95 bg-white shadow-[0_8px_40px_-16px_rgb(15_23_42/0.15)] ring-1 ring-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-100/55 via-transparent to-slate-100/40"
      />
      <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,288px)_1fr] lg:items-center lg:gap-12">
        <div
          className={`rounded-3xl border-2 px-8 py-10 text-center shadow-inner ${scoreTone(stats.average)}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-85">
            Overall content score
          </p>
          <p className="mt-2 text-7xl font-black leading-none tracking-tighter tabular-nums sm:text-8xl">
            {stats.average}
          </p>
          <p className="mt-3 text-sm font-medium opacity-90">
            Arithmetic mean · scaled 0–100
          </p>
          <p className="mt-6 border-t border-current/10 pt-4 text-[11px] font-semibold uppercase tracking-wide opacity-75">
            All URLs in this run
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Run overview
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            The headline score averages each page&apos;s content rubric below. Drill into URLs to chase weak titles, snippets, headings, thin copy, or missing alt descriptions.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Pages scored
              </dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {stats.total}
              </dd>
              <span className="mt-2 block text-xs leading-snug text-slate-500">
                Included in combined average
              </span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Readable fetches
              </dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {stats.loadedOk}
              </dd>
              <span className="mt-2 block text-xs leading-snug text-slate-500">
                Returned usable HTML prose
              </span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Min · max
              </dt>
              <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {stats.min} · {stats.max}
              </dd>
              <span className="mt-2 block text-xs leading-snug text-slate-500">
                Spread across scored URLs
              </span>
            </div>
          </dl>
          <div className="mt-8 flex flex-col gap-6 rounded-2xl bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                Crawl origin
              </p>
              <p className="mt-2 break-all font-mono text-[13px] leading-snug opacity-95">
                {discovery.origin}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Candidate URLs mapped
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {discovery.discoveredUrls}
              </p>
              <span className="text-xs text-slate-400">From public sitemap discovery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col justify-center bg-white px-6 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 tabular-nums text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PageResultCard({ page }: { page: PageRow }) {
  const parsed = parseSignals(page.signals);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/95 bg-white shadow-[0_4px_32px_-8px_rgb(15_23_42/0.12)] ring-1 ring-slate-100">
      {/* Page header */}
      <div className="border-b border-slate-100 bg-gradient-to-br from-orange-50/60 via-white to-slate-50/50 px-7 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Resolved URL
              </span>
              <HttpBadge code={page.httpStatus} />
            </div>
            <p className="mt-3 break-all font-mono text-[13px] font-medium leading-snug text-orange-800 sm:text-[14px]">
              {page.finalUrl}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Crawl target:{" "}
              <span className="font-mono text-slate-700">{page.url}</span>
            </p>
          </div>

          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 px-10 py-6 text-center lg:min-w-[160px] ${scoreTone(page.score.total)}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Content score
            </span>
            <span className="mt-1 text-5xl font-bold tracking-tighter tabular-nums sm:text-[3.25rem]">
              {page.score.total}
            </span>
            <span className="mt-2 text-[11px] font-medium opacity-80">out of 100</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 px-6 py-10 sm:px-8">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Content snapshots
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Editorial signals we could read from the HTML—everything below stays in editorial / UX territory.
          </p>
          <div className="mt-6">
            <SignalsOverview s={parsed} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/35 p-6 ring-1 ring-emerald-100/60">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800/70">
              In good shape
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {page.analysis.positives.length ? (
                page.analysis.positives.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm leading-snug text-slate-800"
                  >
                    <span
                      aria-hidden
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                    />
                    <span>{s}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm italic text-slate-500">
                  No highlighted wins—prioritise the issues column.
                </li>
              )}
            </ul>
          </div>

          <div className="flex flex-col">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Issues & fixes
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              {page.analysis.findings.length ? (
                page.analysis.findings.map((f, i) => (
                  <article
                    key={i}
                    className={`rounded-r-xl rounded-tl-xl p-5 ${severityStyles(f.severity)}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          f.severity === "critical"
                            ? "bg-rose-100 text-rose-800"
                            : f.severity === "warning"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {f.category}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] font-medium leading-snug text-slate-900">
                      {f.detail}
                    </p>
                    <p className="mt-3 border-t border-slate-100/80 pt-3 text-sm leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-900">Recommendation · </span>
                      {f.recommendation}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-6 text-center text-sm text-slate-500">
                  No automated issues matched this URL.
                </p>
              )}
            </div>
          </div>
        </div>

        <ScoreBreakdownRibbon score={page.score} />
      </div>
    </article>
  );
}
