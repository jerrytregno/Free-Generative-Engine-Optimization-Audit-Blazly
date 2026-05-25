import { GoogleGenerativeAI } from "@google/generative-ai";

export type GeminiGeoProbeResponse =
  | {
      status: "ok";
      referenced: boolean;
      prompts: Array<{ prompt: string; rationale: string }>;
      summary: string;
    }
  | { status: "skipped"; message: string }
  | { status: "error"; message: string };

function resolveModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

/**
 * Hypothetical GEO check: asks the model to imagine generic (non-branded) user prompts
 * where the site might be cited. This is NOT live grounding or search logs.
 */
export async function probeGeminiGenericPromptVisibility(input: {
  siteUrl: string;
  hostname: string;
  contentHints: string;
}): Promise<GeminiGeoProbeResponse> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return {
      status: "skipped",
      message:
        "Add GEMINI_API_KEY to .env.local to run the parallel GEO / LLM prompt simulation.",
    };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: resolveModel(),
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 2048,
    },
  });

  const safeHost = input.hostname.replace(/^www\./, "");
  const hints =
    input.contentHints.trim() ||
    "(No homepage copy was retrieved—infer cautiously from the URL only.)";

  const sys = `You are helping audit *generative visibility* (GEO) for a website.
You CANNOT browse the web or see real user chat logs. You must reason hypothetically from training-style knowledge and the hints given.

Site URL: ${input.siteUrl}
Primary hostname (no "www."): ${safeHost}

Homepage / on-page hints (may be empty):
${hints}

Task:
1) Invent 6–8 realistic English user prompts that do NOT include the brand name, company name, or the string "${safeHost}", and do not quote the exact domain. Mix informational and commercial intents that plausibly match this site's niche if inferable from hints.

2) For each prompt, judge whether a typical LLM assistant answer *would be likely to cite or recommend* a page on ${input.siteUrl} for a well-informed user (yes/maybe/no in your head).

3) Return JSON ONLY, no markdown, shape:
{"referenced_any":boolean,"cited":[{"prompt":"string","rationale":"one sentence"}],"summary":"one short sentence"}

Rules:
- cited must list ONLY prompts where citation is plausible (yes/likely). Cap at 3 items; strongest first.
- If none are plausible, referenced_any MUST be false and cited MUST be [].
- Prompts shown to the user MUST NOT contain "${safeHost}" or obvious brand tokens extracted from hints.
- Never claim real-time assistant behavior or telemetry; wording in rationale should reflect uncertainty ("often", "might", "typical assistants").`;

  try {
    const out = await model.generateContent(sys);
    const text = out.response.text();
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) {
      return {
        status: "error",
        message:
          "The model returned no parseable JSON for the GEO probe.",
      };
    }
    const parsed = JSON.parse(m[0]) as {
      referenced_any?: boolean;
      cited?: unknown;
      summary?: string;
    };
    const citedRaw = Array.isArray(parsed.cited) ? parsed.cited : [];
    const prompts = citedRaw
      .filter(
        (row): row is { prompt: string; rationale: string } =>
          row &&
          typeof row === "object" &&
          typeof (row as { prompt?: unknown }).prompt === "string" &&
          typeof (row as { rationale?: unknown }).rationale === "string",
      )
      .map((row) => ({
        prompt: row.prompt.trim(),
        rationale: row.rationale.trim(),
      }))
      .filter((row) => row.prompt.length > 0)
      .slice(0, 3);

    const referenced =
      parsed.referenced_any === true &&
      prompts.length > 0;

    return {
      status: "ok",
      referenced,
      prompts: referenced ? prompts : [],
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : referenced
            ? "The model surfaced generic-style prompts where citations of this domain could plausibly appear."
            : "The model did not surface generic prompts where this domain would plausibly be cited.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GEO LLM probe failed.";
    return { status: "error", message: msg };
  }
}
