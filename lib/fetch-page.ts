import { getUserAgent } from "./http";

const FETCH_TIMEOUT_MS = 20_000;

export type FetchPageResult = {
  url: string;
  status: number;
  contentType: string | null;
  html: string;
  finalUrl: string;
};

export async function fetchPage(url: string): Promise<FetchPageResult> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": getUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const contentType = res.headers.get("content-type");
    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf);
    return {
      url,
      status: res.status,
      contentType,
      html,
      finalUrl: res.url,
    };
  } finally {
    clearTimeout(id);
  }
}
