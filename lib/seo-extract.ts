import * as cheerio from "cheerio";

export type ExtractedSignals = {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string[];
  h2Count: number;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  viewportPresent: boolean;
  charsetDeclared: boolean;
  jsonLdSnippet: string;
  lang: string | null;
  hreflangCount: number;
  geoHints: string[];
};

function stripText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const t =
    $("body").text()?.replace(/\s+/g, " ").trim() ||
    $.root().text()?.replace(/\s+/g, " ").trim();
  return t;
}

/** Pull lightweight on-page signals for scoring and analyst prompts. */
export function extractOnPageSignals(
  html: string,
  pageUrl: string,
  siteOrigin: string,
): ExtractedSignals {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const robotsMeta =
    $('meta[name="robots"]').attr("content")?.trim() ||
    $('meta[name="googlebot"]').attr("content")?.trim() ||
    null;

  const h1 = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);

  const h2Count = $("h2").length;

  const bodyText = stripText(html);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  let originHost: string;
  try {
    originHost = new URL(siteOrigin).hostname.replace(/^www\./, "");
  } catch {
    originHost = "";
  }

  let internal = 0;
  let external = 0;

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:")
    ) {
      return;
    }
    try {
      const abs = new URL(href, pageUrl);
      const host = abs.hostname.replace(/^www\./, "");
      if (host === originHost || host.endsWith(`.${originHost}`)) {
        internal += 1;
      } else {
        external += 1;
      }
    } catch {
      /* ignore */
    }
  });

  const imagesTotal = $("img").length;
  let imagesMissingAlt = 0;
  $("img").each((_, el) => {
    const alt = ($(el).attr("alt") ?? "").trim();
    if (alt.length === 0) imagesMissingAlt += 1;
  });

  const hasOpenGraph = $('meta[property^="og:"]').length > 0;
  const hasTwitterCard = $('meta[name^="twitter:"]').length > 0;
  const viewportPresent = $('meta[name="viewport"]').length > 0;
  const charsetDeclared =
    $('meta[charset]').length > 0 ||
    $('meta[http-equiv="content-type" i]').length > 0;

  const jsonLdRaw = $("script[type='application/ld+json']")
    .map((_, el) => $(el).text())
    .get()
    .join("\n")
    .slice(0, 8000);

  const lang = $("html").attr("lang")?.trim() || null;
  const hreflangCount = $('link[rel="alternate"][hreflang]').length;

  const geoHints: string[] = [];
  const lower = jsonLdRaw.toLowerCase();
  if (/localbusiness|organization|place|geo|geocoordinates|hasmap/.test(lower)) {
    geoHints.push("JSON-LD references local/geo-related types or map fields.");
  }
  if (hreflangCount > 0) {
    geoHints.push(`hreflang alternates present (${hreflangCount}).`);
  }
  if (/\b(address|service area|locations?|near me|maps)\b/i.test(bodyText)) {
    geoHints.push("Body copy references address, service area, or maps-style language.");
  }

  return {
    title,
    metaDescription,
    canonical,
    robotsMeta,
    h1,
    h2Count,
    wordCount,
    internalLinksCount: internal,
    externalLinksCount: external,
    imagesTotal,
    imagesMissingAlt,
    hasOpenGraph,
    hasTwitterCard,
    viewportPresent,
    charsetDeclared,
    jsonLdSnippet: jsonLdRaw,
    lang,
    hreflangCount,
    geoHints,
  };
}
