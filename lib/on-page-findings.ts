import type { ExtractedSignals } from "./seo-extract";

export type FindingSeverity = "critical" | "warning" | "notice";

export type OnPageFinding = {
  category: string;
  severity: FindingSeverity;
  detail: string;
  recommendation: string;
};

export type OnPageAnalysis = {
  positives: string[];
  findings: OnPageFinding[];
};

const severityWeight: Record<FindingSeverity, number> = {
  critical: 0,
  warning: 1,
  notice: 2,
};

/** Content-focused checklist: titles, snippets, headings, body depth, imagery. */
export function buildOnPageAnalysis(signals: ExtractedSignals): OnPageAnalysis {
  const positives: string[] = [];
  const findings: OnPageFinding[] = [];

  const title = signals.title;
  const tLen = title?.length ?? 0;
  if (!title || tLen === 0) {
    findings.push({
      category: "<title>",
      severity: "critical",
      detail: "Page has no `<title>` (or it is empty).",
      recommendation:
        "Add a concise, descriptive title (typically 45–60 characters) that states the page topic.",
    });
  } else {
    if (tLen >= 30 && tLen <= 62) {
      positives.push(`Title length is in a sensible range (${tLen} characters).`);
    } else if (tLen < 30) {
      findings.push({
        category: "<title>",
        severity: "warning",
        detail: `Title is short (${tLen} chars); may undersell relevance in snippets.`,
        recommendation:
          "Expand the title with a clear primary phrase while staying under roughly 65 characters.",
      });
    } else {
      findings.push({
        category: "<title>",
        severity: "warning",
        detail: `Title may be truncated in search (${tLen} chars).`,
        recommendation:
          "Tighten the title to roughly 55–60 characters; keep primary phrases near the beginning.",
      });
    }
  }

  const m = signals.metaDescription;
  if (!m) {
    findings.push({
      category: "Meta description",
      severity: "warning",
      detail:
        "There is no `meta name=\"description\"` (search may choose random body text for snippets).",
      recommendation:
        "Write a compelling ~140–155 character summary with a clear benefit and intent match.",
    });
  } else {
    const mLen = m.length;
    if (mLen >= 120 && mLen <= 165) {
      positives.push(`Meta description length looks reasonable (${mLen} chars).`);
    } else if (mLen < 70) {
      findings.push({
        category: "Meta description",
        severity: "notice",
        detail: `Description is thin (${mLen} chars).`,
        recommendation:
          "Lengthen to ~140 characters with clarity and supporting terms where natural.",
      });
    } else if (mLen > 165) {
      findings.push({
        category: "Meta description",
        severity: "notice",
        detail: `Description is long (${mLen} chars); may be truncated.`,
        recommendation: "Trim to ~155 characters; lead with the main value proposition.",
      });
    }
  }

  const h1s = signals.h1;
  if (h1s.length === 0) {
    findings.push({
      category: "Heading structure",
      severity: "critical",
      detail: "No `<h1>` found on the document.",
      recommendation:
        "Use exactly one H1 that states the primary topic of the visible content.",
    });
  } else if (h1s.length === 1) {
    positives.push(
      `Single primary H1 is present (${h1s[0].slice(0, 72)}${h1s[0].length > 72 ? "…" : ""}).`,
    );
  } else {
    findings.push({
      category: "Heading hierarchy",
      severity: "warning",
      detail: `Multiple H1 headings (${h1s.length}); dilutes the main topic signal.`,
      recommendation:
        "Keep one H1; demote extras to `h2`/`h3` while preserving meaning.",
    });
  }

  if (signals.h2Count >= 2) {
    positives.push(`${signals.h2Count} section headings (\`h2\`) improve scanability.`);
  } else if (signals.h2Count === 0 && signals.wordCount > 400) {
    findings.push({
      category: "Heading hierarchy",
      severity: "notice",
      detail: "Long-form content lacks `h2` section breaks.",
      recommendation:
        "Break copy into labelled sections (`h2`/`h3`) so readers can skim and follow the story.",
    });
  }

  if (signals.wordCount < 200 && signals.wordCount > 0) {
    findings.push({
      category: "Content depth",
      severity: "warning",
      detail: `Visible word count is low (~${signals.wordCount} words); may read as thin.`,
      recommendation:
        "Add depth that matches search intent unless this is intentionally short (e.g. form page).",
    });
  } else if (signals.wordCount >= 400) {
    positives.push(
      `Body copy is substantial (~${signals.wordCount.toLocaleString()} words).`,
    );
  }

  if (signals.imagesTotal > 0) {
    const miss = signals.imagesMissingAlt / signals.imagesTotal;
    if (miss > 0) {
      findings.push({
        category: "Imagery & alt text",
        severity: miss > 0.5 ? "warning" : "notice",
        detail: `${signals.imagesMissingAlt}/${signals.imagesTotal} images lack meaningful alt text.`,
        recommendation:
          "Describe non-decorative images in `alt`; use empty alt only for purely decorative assets.",
      });
    } else {
      positives.push("All analysed images include `alt` text.");
    }
  }

  findings.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity]);

  return {
    positives:
      positives.length > 0
        ? positives
        : findings.length === 0
          ? ["No major content-structure issues flagged by these checks."]
          : [],
    findings,
  };
}
