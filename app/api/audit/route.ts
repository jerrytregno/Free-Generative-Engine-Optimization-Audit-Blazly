import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeWebsiteInput } from "@/lib/http";
import { discoverAllSitemapUrls } from "@/lib/sitemap";
import { fetchPage } from "@/lib/fetch-page";
import { extractOnPageSignals, type ExtractedSignals } from "@/lib/seo-extract";
import { computeContentScore, type ContentScoreBreakdown } from "@/lib/seo-score";
import { buildOnPageAnalysis, type OnPageAnalysis } from "@/lib/on-page-findings";
import { prioritizeUrls } from "@/lib/url-priority";
import {
  probeGeminiGenericPromptVisibility,
  type GeminiGeoProbeResponse,
} from "@/lib/gemini-geo-probe";
import { fetchHomepageContentHints } from "@/lib/homepage-hints";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  email: z.string().email(),
  websiteUrl: z.string().min(3),
  maxPages: z.number().int().min(1).max(30).optional(),
});

const zeroScore = (): ContentScoreBreakdown => ({
  total: 0,
  title: 0,
  metaDescription: 0,
  headings: 0,
  images: 0,
});

function crawlFailureAnalysis(detail: string, recommendation: string): OnPageAnalysis {
  return {
    positives: [],
    findings: [
      {
        category: "Content audit",
        severity: "critical",
        detail,
        recommendation,
      },
    ],
  };
}

export type AuditPageRow = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  score: ContentScoreBreakdown;
  signals: ExtractedSignals;
  analysis: OnPageAnalysis;
};

function trimSignalsForJson(s: ExtractedSignals): ExtractedSignals {
  return {
    ...s,
    jsonLdSnippet:
      s.jsonLdSnippet.length > 2000
        ? `${s.jsonLdSnippet.slice(0, 2000)}\n…`
        : s.jsonLdSnippet,
  };
}

async function auditPrioritizedPages(
  origin: string,
  prioritized: string[],
): Promise<AuditPageRow[]> {
  const pages: AuditPageRow[] = [];
  const emptySignalsHtml = extractOnPageSignals(
    "<html><body></body></html>",
    origin,
    origin,
  );

  for (const url of prioritized) {
    try {
      const res = await fetchPage(url);

      if (res.status >= 400) {
        pages.push({
          url,
          finalUrl: res.finalUrl,
          httpStatus: res.status,
          score: zeroScore(),
          signals: trimSignalsForJson(emptySignalsHtml),
          analysis: crawlFailureAnalysis(
            `We couldn't load readable page HTML (browser would see HTTP ${res.status}).`,
            "Fix broken pages or access rules so editors can load the URL normally, then run the audit again.",
          ),
        });
        continue;
      }

      const ctype = res.contentType?.toLowerCase() ?? "";
      const htmlish =
        !ctype ||
        ctype.includes("text/html") ||
        ctype.includes("application/xhtml");
      const hasHtmlShape = /<\s*html[\s>]/i.test(res.html);
      if (!htmlish && !hasHtmlShape) {
        pages.push({
          url,
          finalUrl: res.finalUrl,
          httpStatus: res.status,
          score: zeroScore(),
          signals: trimSignalsForJson(emptySignalsHtml),
          analysis: crawlFailureAnalysis(
            "This URL did not resolve to readable HTML prose (often a file download, PDF, API JSON, or image).",
            "Point your sitemap at URLs that behave like landing pages/articles in the browser so we can read titles and body copy.",
          ),
        });
        continue;
      }

      if (res.html.trim().length < 80) {
        pages.push({
          url,
          finalUrl: res.finalUrl,
          httpStatus: res.status,
          score: zeroScore(),
          signals: trimSignalsForJson(emptySignalsHtml),
          analysis: crawlFailureAnalysis(
            "The returned HTML barely contained markup or text—we couldn't score the writing.",
            "Ensure the visitor-visible story loads as real HTML words (not mostly empty placeholders), then retry.",
          ),
        });
        continue;
      }

      const signals = extractOnPageSignals(res.html, res.finalUrl, origin);
      const score = computeContentScore(signals);
      const analysis = buildOnPageAnalysis(signals);

      pages.push({
        url,
        finalUrl: res.finalUrl,
        httpStatus: res.status,
        score,
        signals: trimSignalsForJson(signals),
        analysis,
      });
    } catch {
      pages.push({
        url,
        finalUrl: url,
        httpStatus: 0,
        score: zeroScore(),
        signals: trimSignalsForJson(emptySignalsHtml),
        analysis: crawlFailureAnalysis(
          "This page took too long to answer or timed out.",
          "Open the URL in your browser once the site is reachable, confirm it loads cleanly, then run the audit again.",
        ),
      });
    }
  }

  return pages;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { email, websiteUrl } = parsed.data;
    const maxPages = parsed.data.maxPages ?? 18;

    const originUrl = normalizeWebsiteInput(websiteUrl);
    const originStr = originUrl.toString();

    const [homepageHints, { origin, sitemapSeeds, allPageUrls }] = await Promise.all([
      fetchHomepageContentHints({ origin: originStr }),
      discoverAllSitemapUrls(originStr),
    ]);

    const prioritized = prioritizeUrls(origin, allPageUrls, maxPages);

    const hostnameClean = originUrl.hostname.replace(/^www\./i, "");

    const [pages, geoGemini]: [AuditPageRow[], GeminiGeoProbeResponse] =
      await Promise.all([
        auditPrioritizedPages(origin, prioritized),
        probeGeminiGenericPromptVisibility({
          siteUrl: `${originUrl.protocol}//${originUrl.hostname}/`,
          hostname: hostnameClean,
          contentHints: homepageHints,
        }),
      ]);

    return NextResponse.json({
      lead: {
        email,
      },
      discovery: {
        origin,
        sitemapSeeds,
        discoveredUrls: allPageUrls.length,
        analyzedUrls: pages.length,
      },
      geoGemini,
      pages,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected audit failure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
