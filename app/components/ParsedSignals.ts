/** Safely coerce API `signals` JSON into typed fields for the UI. */
export type ParsedSignals = {
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

function nullableString(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export function parseSignals(raw: Record<string, unknown>): ParsedSignals {
  const h1Raw = raw.h1;
  const h1 = Array.isArray(h1Raw)
    ? h1Raw.filter((x): x is string => typeof x === "string")
    : [];

  const geoRaw = raw.geoHints;
  const geoHints = Array.isArray(geoRaw)
    ? geoRaw.filter((x): x is string => typeof x === "string")
    : [];

  const num = (key: string, fallback: number): number => {
    const v = raw[key];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };

  const bool = (key: string): boolean => raw[key] === true;

  return {
    title: nullableString(raw, "title"),
    metaDescription: nullableString(raw, "metaDescription"),
    canonical: nullableString(raw, "canonical"),
    robotsMeta: nullableString(raw, "robotsMeta"),
    h1,
    h2Count: num("h2Count", 0),
    wordCount: num("wordCount", 0),
    internalLinksCount: num("internalLinksCount", 0),
    externalLinksCount: num("externalLinksCount", 0),
    imagesTotal: num("imagesTotal", 0),
    imagesMissingAlt: num("imagesMissingAlt", 0),
    hasOpenGraph: bool("hasOpenGraph"),
    hasTwitterCard: bool("hasTwitterCard"),
    viewportPresent: bool("viewportPresent"),
    charsetDeclared: bool("charsetDeclared"),
    jsonLdSnippet: typeof raw.jsonLdSnippet === "string" ? raw.jsonLdSnippet : "",
    lang: nullableString(raw, "lang"),
    hreflangCount: num("hreflangCount", 0),
    geoHints,
  };
}

export function formatAbsent(value: string | null | undefined): string {
  if (value === null || value === undefined || !String(value).trim()) return "Not set";
  return String(value);
}
