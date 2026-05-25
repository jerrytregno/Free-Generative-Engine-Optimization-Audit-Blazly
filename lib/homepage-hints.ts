import { fetchPage } from "./fetch-page";
import { extractOnPageSignals } from "./seo-extract";

/** Short text bundle from the live homepage to steer the GEO / LLM simulation. */
export async function fetchHomepageContentHints(params: {
  origin: string;
}): Promise<string> {
  const base = params.origin.replace(/\/$/, "");
  const tries = [`${base}/`, base];

  let lastHtml = "";
  let okUrl = "";

  for (const candidate of tries) {
    try {
      const res = await fetchPage(candidate);
      if (res.status >= 400) continue;
      if (res.html.trim().length < 80) continue;
      lastHtml = res.html;
      okUrl = res.finalUrl;
      break;
    } catch {
      /* try next */
    }
  }

  if (!lastHtml) return "";

  const signals = extractOnPageSignals(lastHtml, okUrl || tries[0], params.origin);

  const parts: string[] = [];
  if (signals.title) parts.push(`Title: ${signals.title}`);
  if (signals.metaDescription) parts.push(`Meta: ${signals.metaDescription}`);
  if (signals.h1[0]) parts.push(`H1: ${signals.h1[0]}`);

  return parts.join("\n").slice(0, 1500);
}
