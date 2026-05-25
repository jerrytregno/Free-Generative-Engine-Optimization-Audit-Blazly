const USER_AGENT =
  "BlazlySEOGeoAudit/1.0 (+https://blazly.ai; audit crawler)";

export function getUserAgent(): string {
  return USER_AGENT;
}

/** Normalize user input into an origin URL (https when possible). */
export function normalizeWebsiteInput(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Website URL is required.");
  }
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (!url.hostname) {
    throw new Error("Invalid website hostname.");
  }
  return url;
}
