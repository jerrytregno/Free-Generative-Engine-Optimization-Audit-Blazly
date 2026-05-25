function isProbablyHome(url: string, origin: string): boolean {
  try {
    const u = new URL(url);
    const o = new URL(origin);
    const h1 = u.hostname.replace(/^www\./, "");
    const h2 = o.hostname.replace(/^www\./, "");
    if (h1 !== h2) return false;
    const path = u.pathname.replace(/\/$/, "") || "/";
    return path === "/";
  } catch {
    return false;
  }
}

function priorityScore(url: string): number {
  let s = 0;
  let pathObj: URL;
  try {
    pathObj = new URL(url);
  } catch {
    return -9999;
  }

  const pathname = pathObj.pathname.toLowerCase();
  const qs = pathObj.search.length;

  const junk =
    /(feed|rss|login|sign-in|signup|sign-up|cart|checkout|thank-you|replytocom|\?utm_|\/wp-json)/i;
  if (junk.test(url)) s -= 100;

  if (
    /\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|woff2?)$/i.test(pathname) ||
    pathname.endsWith(".xml")
  ) {
    s -= 120;
  }

  const hub = [
    /\/pricing\b/,
    /\/plans?\b/,
    /\/features\b/,
    /\/products?\b/,
    /\/services?\b/,
    /\/solutions?\b/,
    /\/demo\b/,
    /\/blog\b/,
    /\/guides?\b/,
    /\/resources?\b/,
    /\/contact\b/,
    /\/about\b/,
  ];
  if (hub.some((r) => r.test(pathname))) s += 50;

  if (/\/tag\/|\/category\/|\/author\/|\/page\/\d+/.test(pathname)) s -= 35;

  s -= qs * 3;
  /* Shorter paths often anchor commercial taxonomy */
  const depth = pathname.split("/").filter(Boolean).length;
  if (depth <= 2 && pathname !== "/") s += 12;

  if (pathname === "/" || pathname === "") s += 30;

  return s;
}

/**
 * Dedupes URLs, prefers true homepage variants first, then path/query heuristics
 * — no AI, suitable for crawling a capped set for on-page checks.
 */
export function prioritizeUrls(
  origin: string,
  urls: string[],
  max: number,
): string[] {
  const uniq = [...new Set(urls)];
  const home = uniq.filter((u) => isProbablyHome(u, origin));
  const rest = uniq.filter((u) => !home.includes(u));
  rest.sort((a, b) => priorityScore(b) - priorityScore(a));
  const merged = [...new Set([...home, ...rest])];
  return merged.slice(0, Math.max(0, max));
}
