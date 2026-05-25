import type { ExtractedSignals } from "./seo-extract";

/** Copy & structure only (no technical/crawl/stack signals). */
export type ContentScoreBreakdown = {
  total: number;
  title: number;
  metaDescription: number;
  headings: number;
  images: number;
};

const CONTENT_RAW_MAX = 55; /* title 15 + meta 15 + headings 15 + images 10 */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** 0–100 score from title, meta, heading structure, imagery/alt coverage only. */
export function computeContentScore(s: ExtractedSignals): ContentScoreBreakdown {
  let titlePts = 0;
  if (s.title) {
    const len = s.title.length;
    if (len >= 30 && len <= 60) titlePts = 15;
    else if (len >= 15 && len < 75) titlePts = 10;
    else titlePts = 6;
  }

  let metaPts = 0;
  if (s.metaDescription) {
    const len = s.metaDescription.length;
    if (len >= 120 && len <= 160) metaPts = 15;
    else if (len >= 70 && len < 200) metaPts = 10;
    else metaPts = 6;
  }

  let headPts = 0;
  if (s.h1.length === 1) headPts += 8;
  else if (s.h1.length > 1) headPts += 4;
  if (s.h2Count >= 2) headPts += 7;
  else if (s.h2Count === 1) headPts += 4;

  let imgPts = 0;
  if (s.imagesTotal === 0) imgPts = 6;
  else {
    const missingRatio = s.imagesMissingAlt / s.imagesTotal;
    if (missingRatio === 0) imgPts = 10;
    else if (missingRatio < 0.25) imgPts = 7;
    else if (missingRatio < 0.5) imgPts = 4;
    else imgPts = 2;
  }

  const headingsPart = clamp(headPts, 0, 15);
  const imagesPart = clamp(imgPts, 0, 10);

  const raw = titlePts + metaPts + headingsPart + imagesPart;

  const total = clamp(
    Math.round((raw / CONTENT_RAW_MAX) * 100),
    0,
    100,
  );

  return {
    total,
    title: titlePts,
    metaDescription: metaPts,
    headings: headingsPart,
    images: imagesPart,
  };
}
