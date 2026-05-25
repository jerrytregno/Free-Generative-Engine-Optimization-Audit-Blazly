import { XMLParser } from "fast-xml-parser";
import { getUserAgent, normalizeWebsiteInput } from "./http";

const MAX_SITEMAP_URLS = 800;
const MAX_SITEMAP_INDEX_CHILDREN = 50;

/** Extract `<loc>` URLs from known sitemap element shapes. */
function collectLocs(parsed: Record<string, unknown>): string[] {
  const urls: string[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.loc === "string") {
      urls.push(o.loc.trim());
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) {
        for (const item of v) visit(item);
      } else if (v && typeof v === "object") {
        visit(v);
      }
    }
  };

  visit(parsed);
  return urls.filter(Boolean);
}

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": getUserAgent(), Accept: "*/*" },
    });
    return await res.text();
  } finally {
    clearTimeout(id);
  }
}

function parseSitemapXml(xml: string): { locs: string[]; isIndex: boolean } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rootKey = Object.keys(doc)[0];
  const root = rootKey ? (doc[rootKey] as Record<string, unknown>) : doc;

  const hasSitemapIndex =
    rootKey?.toLowerCase().includes("sitemapindex") ||
    (root && "sitemap" in root && !("url" in root));

  const locs = collectLocs(doc);
  return { locs, isIndex: Boolean(hasSitemapIndex) };
}

/** Read robots.txt for Sitemap: directives. */
export async function discoverSitemapsFromRobots(origin: URL): Promise<string[]> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  try {
    const text = await fetchText(robotsUrl);
    const lines = text.split(/\r?\n/);
    const out: string[] = [];
    for (const line of lines) {
      const m = /^sitemap:\s*(.+)$/i.exec(line.trim());
      if (m) out.push(m[1].trim());
    }
    return out;
  } catch {
    return [];
  }
}

const COMMON_SITEMAP_PATHS = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/wp-sitemap.xml",
  "/sitemaps/sitemap.xml",
];

export async function discoverAllSitemapUrls(
  websiteInput: string,
): Promise<{ origin: string; sitemapSeeds: string[]; allPageUrls: string[] }> {
  const originUrl = normalizeWebsiteInput(websiteInput);
  const origin = originUrl.origin;

  const seeds = new Set<string>();
  for (const s of await discoverSitemapsFromRobots(originUrl)) {
    try {
      seeds.add(new URL(s, originUrl).toString());
    } catch {
      /* skip bad url */
    }
  }
  for (const p of COMMON_SITEMAP_PATHS) {
    seeds.add(new URL(p, originUrl).toString());
  }

  const queue = [...seeds];
  const seenSitemaps = new Set<string>();
  const pageUrls = new Set<string>();

  while (queue.length && pageUrls.size < MAX_SITEMAP_URLS) {
    const sm = queue.shift();
    if (!sm || seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);

    let xml: string;
    try {
      xml = await fetchText(sm);
    } catch {
      continue;
    }

    const { locs, isIndex } = parseSitemapXml(xml);
    if (isIndex) {
      const child = locs.slice(0, MAX_SITEMAP_INDEX_CHILDREN);
      for (const c of child) {
        try {
          queue.push(new URL(c, originUrl).toString());
        } catch {
          /* skip */
        }
      }
    } else {
      for (const u of locs) {
        try {
          const abs = new URL(u, originUrl).toString();
          /* Heuristic: only collect http(s) document URLs */
          if (/^https?:\/\//i.test(abs) && !abs.match(/\.(xml|jpg|jpeg|png|gif|webp|pdf|zip)$/i)) {
            pageUrls.add(abs);
          }
        } catch {
          /* skip */
        }
        if (pageUrls.size >= MAX_SITEMAP_URLS) break;
      }
    }
  }

  /* If sitemaps yielded nothing, fall back to homepage only */
  if (pageUrls.size === 0) {
    pageUrls.add(originUrl.toString().replace(/\/$/, "") || originUrl.toString());
  }

  return {
    origin,
    sitemapSeeds: [...seeds],
    allPageUrls: [...pageUrls],
  };
}
