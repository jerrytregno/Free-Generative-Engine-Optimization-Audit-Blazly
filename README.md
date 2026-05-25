# Blazly SEO & GEO audit

On-page focussed **content** auditor: gathers email + URL, discovers public XML sitemaps, picks a capped set of crawlable URLs with **deterministic priorities** (homepage + hubs, debiased noisy paths), downloads HTML, and reviews **titles, meta snippets, headings, approximate word depth, imagery/alt**, with a **heuristic content score** plus findings.

Technical crawl/index signals (canonical, robots directives, OG/Twitter, viewport, structured data previews, etc.) are **not surfaced**—only editorial signals and friendly notes when prose could not be read.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` only if needed.

- **`GEMINI_API_KEY`** (optional): when set, each audit runs a **parallel LLM GEO check** that simulates whether generic (non‑branded) prompts might cite the site—not live search telemetry. The same key also fills **Blog + landing keyword suggestions** grounded in homepage copy (still not live SERP data).
- **`FIREBASE_SERVICE_ACCOUNT_JSON`** (optional): full JSON body of a **Firebase service account** key with permission to write Firestore. When set, every successful `/api/audit` request persists **work email** (after validation), **website URL as entered**, and **normalized crawl origin**, plus timestamp, under the `audit_leads` collection.

Leads accept **business domains only** (Gmail, Outlook, Yahoo, iCloud and other common consumer / disposable domains are rejected with HTTP 400). The web client SDK snippet from the Firebase console is **not** used server-side — create a backend service account instead (Firestore → Rules can deny normal clients; writes use this key).

### Firebase quick setup

1. Enable **Cloud Firestore** (Native mode).
2. In **Project settings → Service accounts**, generate a new private key; download JSON.
3. Put the JSON in `.env.local` as **`FIREBASE_SERVICE_ACCOUNT_JSON=`** paste (minified to one line is fine).
4. Copy the **Web app** SDK fields into **`NEXT_PUBLIC_FIREBASE_*`** in `.env.local` (same names as Firebase console names; consumed via `lib/firebase-client-env.ts` — **never paste keys into source files**).
5. Optional rules example: disallow public reads/writes and rely on the Admin SDK (`request.auth == null` denies user traffic; admins bypass rules).

## Behaviour

| Step | Detail |
| --- | --- |
| Discovery | `robots.txt` + common sitemap URLs, follows indexes with caps |
| Filtering | Homepage first, boosts obvious commercial/learn paths, downranks feeds/auth noise |
| Extraction | Titles & meta snippets, heading stack (`h1`/`h2`), stripped word-count proxy, images + alt coverage |
| Scoring | Only those four pillar buckets (max combined 55 raw points ⇒ 0‑100 headline score on the dashboard) |
| Findings | Human-readable recommendations limited to editorial / structure issues |
| Lead capture | When `FIREBASE_SERVICE_ACCOUNT_JSON` is set: each request stores **validated work email**, **URLs**, and **`createdAt`** in Firestore (`audit_leads`). Consumer Gmail/Outlook/Yahoo/etc. are rejected server-side |

## Notes

Hosts that throttle unknown User-Agents surface **availability** findings rather than markup checks.

Thin SPAs returning empty shells will register as truncated HTML—consider SSR audits separately.
