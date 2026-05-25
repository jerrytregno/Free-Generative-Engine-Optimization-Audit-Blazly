import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ObjectSchema } from "@google/generative-ai";

export type PublishKeywordOpportunitiesResponse =
  | {
      status: "ok";
      summary: string;
      blogKeywords: Array<{ keyword: string; rationale: string }>;
      landingKeywords: Array<{ keyword: string; rationale: string }>;
    }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

function stripJsonCodeFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const close = t.lastIndexOf("}");
    const open = t.indexOf("{");
    if (open >= 0 && close >= open) {
      t = t.slice(open, close + 1);
    }
  }
  return t.trim();
}

function resolveModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

const publishKeywordSlotSchema = {
  type: SchemaType.OBJECT,
  properties: {
    keyword: { type: SchemaType.STRING, description: "Target Google-style query phrase" },
    rationale: {
      type: SchemaType.STRING,
      description: "Short reason this is a plausible SEO win",
    },
  },
  required: ["keyword", "rationale"],
} satisfies ObjectSchema;

const publishKeywordsResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "One-sentence takeaway for the marketer",
    },
    blog: {
      type: SchemaType.ARRAY,
      description: "10–12 informational / blog intent phrases",
      items: publishKeywordSlotSchema,
    },
    landing: {
      type: SchemaType.ARRAY,
      description: "10–12 commercial landing-page intent phrases",
      items: publishKeywordSlotSchema,
    },
  },
  required: ["summary", "blog", "landing"],
} satisfies ObjectSchema;

function normalizeKwRows(
  raw: unknown,
  cap: number,
): Array<{ keyword: string; rationale: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (row): row is { keyword?: unknown; rationale?: unknown } =>
        row !== null && typeof row === "object",
    )
    .map((row) => {
      const kw =
        typeof row.keyword === "string"
          ? row.keyword.trim()
          : typeof (row as { phrase?: unknown }).phrase === "string"
            ? (row as { phrase: string }).phrase.trim()
            : "";
      return {
        keyword: kw,
        rationale: typeof row.rationale === "string" ? row.rationale.trim() : "",
      };
    })
    .filter((r) => r.keyword.length > 0)
    .slice(0, cap);
}

/**
 * Editorial-style keyword ideas — not ranking guarantees; no SERP grounding.
 */
export async function probeBlazlyPublishKeywordOpportunities(input: {
  siteUrl: string;
  hostname: string;
  contentHints: string;
}): Promise<PublishKeywordOpportunitiesResponse> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return {
      status: "skipped",
      message:
        "Add GEMINI_API_KEY to .env.local to generate publish keyword suggestions.",
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: resolveModel(),
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: publishKeywordsResponseSchema,
    },
  });

  const safeHost = input.hostname.replace(/^www\./, "");
  const hints =
    input.contentHints.trim() ||
    "(No homepage copy was retrieved—infer niche only from hostname/URL.)";

  const prompt = `You are an SEO strategist for companies that publish with **Blazly** — an AI platform for SEO-friendly blogs and conversion landing pages.
You CANNOT fetch live SERPs, volume, difficulty, or rankings. Infer only from homepage hints plus the URL hostname.

Website: ${input.siteUrl}
Hostname (no "www"): ${safeHost}

Homepage / on-page hints:
${hints}

Task:
Assume this brand will routinely ship **fresh blogs** and **dedicated landing pages** through Blazly (proper titles, headings, snippets, structured intent). Propose searches they could often **earn visibility for first** versus brutally contested head keywords.

Respond with JSON exactly matching the required schema fields (you must not omit keys).
Each blog / landing row: concise Google-style queries and one-sentence rationales.

Rules:
- blog: informational / evergreen / comparisons / how-to; **minimum 10, maximum 12** strings.
- landing: commercial intent (trial, demo, pricing adjacency, product category, signup); **minimum 10, maximum 12** strings.
- Prefer achievable long-tail and mid-tail; avoid impossible vanity one-word generics unless clearly niche.
- Phrases MUST NOT paste raw "${safeHost}" or the bare domain tokens; incidental brand words about *their offering* inside the niche are okay.
- Mention that results are illustrative in rationale wording ("might", "often", "typically lower competition").
- Never claim measurable rank or CPC / volume`;

  try {
    const out = await model.generateContent(prompt);
    const raw = stripJsonCodeFence(out.response.text().trim());
    let parsed: { summary?: string; blog?: unknown; landing?: unknown };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      const m = /\{[\s\S]*\}/.exec(raw);
      if (!m) {
        return {
          status: "error",
          message:
            "The model returned no parseable JSON for publish keyword suggestions.",
        };
      }
      try {
        parsed = JSON.parse(m[0]) as typeof parsed;
      } catch {
        return {
          status: "error",
          message:
            "Could not validate publish keyword suggestions; try running the audit again.",
        };
      }
    }

    const blogKeywords = normalizeKwRows(parsed.blog, 12);
    const landingKeywords = normalizeKwRows(parsed.landing, 12);

    if (blogKeywords.length === 0 && landingKeywords.length === 0) {
      return {
        status: "error",
        message: "Publish keyword planner returned empty lists.",
      };
    }

    return {
      status: "ok",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Suggested blog and landing targets that often fit attainable SEO wins when publishing consistently.",
      blogKeywords,
      landingKeywords,
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Publish keyword planner failed.";
    return { status: "error", message: msg };
  }
}
