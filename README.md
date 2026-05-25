# Blazly SEO & GEO audit

On-page focussed **content** auditor: gathers email + URL, discovers public XML sitemaps, picks a capped set of crawlable URLs with **deterministic priorities** (homepage + hubs, debiased noisy paths), downloads HTML, and reviews **titles, meta snippets, headings, approximate word depth, imagery/alt**, with a **heuristic content score** plus findings.

Technical crawl/index signals (canonical, robots directives, OG/Twitter, viewport, structured data previews, etc.) are **not surfaced**—only editorial signals and friendly notes when prose could not be read.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` only if needed. **`GEMINI_API_KEY`** is optional: when set, each audit runs a **parallel LLM GEO check** that simulates whether generic (non‑branded) prompts might cite the site—not live search telemetry.

## Behaviour

| Step | Detail |
| --- | --- |
| Discovery | `robots.txt` + common sitemap URLs, follows indexes with caps |
| Filtering | Homepage first, boosts obvious commercial/learn paths, downranks feeds/auth noise |
| Extraction | Titles & meta snippets, heading stack (`h1`/`h2`), stripped word-count proxy, images + alt coverage |
| Scoring | Only those four pillar buckets (max combined 55 raw points ⇒ 0‑100 headline score on the dashboard) |
| Findings | Human-readable recommendations limited to editorial / structure issues |

## Notes

Hosts that throttle unknown User-Agents surface **availability** findings rather than markup checks.

Thin SPAs returning empty shells will register as truncated HTML—consider SSR audits separately.
