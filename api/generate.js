import Anthropic from "@anthropic-ai/sdk";

// Model per the build spec. JSON output.
const MODEL = "claude-sonnet-4-6";

function systemPrompt(role) {
  return `You draft performance reviews for a manager, grounded ONLY in a provided signal digest from Klarity (a work-capture platform). Rules:

1. SIGNAL-GROUNDED: Every claim must trace to a specific signal. Never invent projects, metrics, or behaviors. Each strength cites its signal title.
2. BALANCED: Real strengths AND honest growth areas. Process Friction signals are growth material — frame constructively (e.g., a friction the person surfaced is partly a contribution). No hype doc.
3. ROLE-AWARE: role = ${role}.
   - Process Performer: emphasize execution quality, throughput, accuracy, process discipline, tool adoption.
   - Champion: emphasize enablement, peer influence, adoption driven, knowledge codified, risk surfaced. Do not judge champions on personal process volume.
4. MANAGER-READY: first person plural or neutral manager voice, specific, sendable with light edits. No corporate filler.
5. THIN SIGNALS: if the digest is sparse (<5 signals) or lacks strength evidence, DO NOT draft a review. Return ask mode with specific questions the manager should answer to fill the gaps.

Return ONLY valid JSON:
{"mode":"review","summary":"...","strengths":[{"point":"...","evidence":"signal title"}],"growth_areas":[{"point":"...","evidence":"signal title"}],"goals":["..."]}
or
{"mode":"ask","reason":"...","observed":["what the few signals DO show"],"questions":["..."]}`;
}

function userMessage({ name, role, signals, thin }) {
  const thinNote = thin
    ? `\n\nNOTE: This digest is thin (${signals.length} signal(s) and/or missing strength evidence). Per rule 5 you MUST return "ask" mode — do not draft a review. Ground the questions in the signal types actually present.`
    : "";
  return `Person: ${name}
Role: ${role}
Signal count: ${signals.length}

Signal rows (JSON):
${JSON.stringify(signals, null, 2)}${thinNote}`;
}

// Pull the JSON object out of the model's text, tolerating stray prose or
// markdown fences. Throws if nothing parseable is found.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Core generation: build the prompt, call Anthropic, return the parsed review
 * or ask-mode object. Exported so tests and the HTTP handler share one path.
 */
export async function generateReview({ name, role, signals, thin }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "disabled" },
    system: systemPrompt(role),
    messages: [{ role: "user", content: userMessage({ name, role, signals, thin }) }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { name, role, signals, thin } = req.body || {};
    if (!name || !role || !Array.isArray(signals) || signals.length === 0) {
      res.status(400).json({ error: "Request needs name, role, and a non-empty signals array" });
      return;
    }

    const result = await generateReview({ name, role, signals, thin: Boolean(thin) });
    res.status(200).json(result);
  } catch (err) {
    // Never hard-fail — surface a clean message the client renders as an error state.
    console.error("generate error:", err);
    res.status(500).json({ error: err.message || "Failed to generate review" });
  }
}
