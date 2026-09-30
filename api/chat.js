// Vercel serverless function (Node runtime).
// Lives at /api/chat and is called from the browser.
//
// Request shapes:
//   POST { mode: "chat",  messages: [{ role, content }, ...] }
//     → SSE stream: text/event-stream
//     → emits: event: log   data: { text }
//              event: token data: { text }
//              event: done  data: {}
//              event: error data: { message }
//
//   POST { mode: "match", jobDescription: "<pasted text>" }
//     → JSON: application/json  (needs full structured output for parsing)

import Groq from "groq-sdk";
import {
  PROFILE,
  EXPERIENCE,
  PROJECTS,
  SKILLS,
  EDUCATION,
  CERTIFICATIONS,
} from "../src/data/resumeData.js";

// ─── Model ────────────────────────────────────────────────────────────────────
const MODEL = "openai/gpt-oss-120b"; // Updated: llama-3.3-70b-versatile was decommissioned. openai/gpt-oss-120b is Groq's recommended production tier replacement.

// ─── Resume context builder ────────────────────────────────────────────────────
async function buildResumeContext() {
  const gistUrl = process.env.VITE_RESUME_GIST_URL;
  let liveData = { PROFILE, EXPERIENCE, PROJECTS, SKILLS, EDUCATION, CERTIFICATIONS };
  
  if (gistUrl) {
    try {
      const res = await fetch(gistUrl, { cache: "no-store" });
      if (res.ok) {
        liveData = { ...liveData, ...(await res.json()) };
      }
    } catch (err) {
      console.warn("Failed to fetch live resume data for AI:", err.message);
    }
  }

  return `
CANDIDATE PROFILE
Name: ${liveData.PROFILE.name}
Location: ${liveData.PROFILE.location}
Tagline: ${liveData.PROFILE.tagline}
Pitch: ${liveData.PROFILE.pitch}
Highlights: ${liveData.PROFILE.highlights.join(" | ")}

EXPERIENCE
${liveData.EXPERIENCE.map(
    (e) =>
      `- ${e.role} @ ${e.org} (${e.dates}): ${e.points.join(" ")}`
  ).join("\n")}

PROJECTS
${liveData.PROJECTS.map((p) => `- ${p.name} [${p.status}]: ${p.description}`).join(
    "\n"
  )}

SKILLS
${liveData.SKILLS.map((s) => `${s.name} (${s.group})`).join(", ")}

EDUCATION
${liveData.EDUCATION.map((e) => `- ${e.program}, ${e.school} (${e.dates})`).join(
    "\n"
  )}

CERTIFICATIONS
${liveData.CERTIFICATIONS.map((c) => `- ${c}`).join("\n")}
`.trim();
}

// ─── SSE helpers ──────────────────────────────────────────────────────────────
/**
 * Write a single SSE frame.
 * @param {import('http').ServerResponse} res
 * @param {string} event  - SSE event name
 * @param {object} data   - JSON-serialisable payload
 */
function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Open SSE headers.
 */
function openSSE(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx/Vercel proxy buffering
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders?.(); // flush immediately so the browser sees the headers
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body =
    typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { mode } = body;

  // ── Validate API key ────────────────────────────────────────────────────────
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    if (mode === "chat") {
      openSSE(req, res);
      sseWrite(res, "error", {
        message:
          "GROQ_API_KEY is not set on the server. Add it in your Vercel project's Environment Variables.",
      });
      res.end();
    } else {
      res.status(500).json({
        error:
          "GROQ_API_KEY is not set on the server. Add it in your Vercel project's Environment Variables.",
      });
    }
    return;
  }

  const groq = new Groq({ apiKey });
  const resumeContext = await buildResumeContext();

  // ════════════════════════════════════════════════════════════════════════════
  // CHAT MODE  —  SSE stream
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "chat") {
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    openSSE(req, res);

    // Track whether the client disconnected mid-stream
    let aborted = false;
    req.on("aborted", () => {
      aborted = true;
    });

    try {
      if (aborted) {
        res.end();
        return;
      }

      const system = `You are a friendly, highly professional AI Recruitment Assistant for ${PROFILE.name}'s digital portfolio. Follow these strict response and evidence rules:
1. GREETINGS & SMALL TALK: If the user says a common greeting (e.g., 'hi', 'hello', 'who are you', 'hey'), respond warmly, introduce yourself as ${PROFILE.name.split(" ")[0]}'s AI assistant, and invite them to ask questions about his data science projects or background. Do not say you don't have information for greetings.
2. RESUME INQUIRIES: Answer from the provided Resume Context only. Synthesize a concise, professional, conversational response in the third person. Do not invent qualifications, dates, employers, or results.
3. STRUCTURE: Never return one dense block. Use a short bold heading for each distinct section (for example **Background**, **Experience**, **Key Projects**, **Skill Set**) on its own line. Put exactly one blank line (two newline characters) between headings, paragraphs, and sections. For multiple items, use a Markdown list with each item on its own line, formatted as "- **Label:** concise detail". Keep bullets distinct; never put multiple dash-prefixed items in one paragraph or use inline dashes as faux bullets. Use at most 3 sections and 5 bullets unless the question needs more.
4. ABSENT INFORMATION: If a requested detail is not covered in the resume context, say so briefly and do not infer it. Guide the visitor back to the available portfolio information.

RESUME CONTEXT:
${resumeContext}`;

      const stream = await groq.chat.completions.create({
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "").slice(0, 4000),
          })),
        ],
        model: MODEL,
        max_tokens: 700,
        stream: true,
      });

      for await (const chunk of stream) {
        if (aborted) break;
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          sseWrite(res, "token", { text });
        }
      }

      if (!aborted) {
        sseWrite(res, "done", {});
      }
    } catch (err) {
      console.error("[chat SSE error]", err);
      if (!aborted) {
        sseWrite(res, "error", { message: err.message || "Stream error" });
      }
    } finally {
      res.end();
    }
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MATCH MODE  —  standard JSON (needs full structured response for parsing)
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === "match") {
    const { jobDescription } = body;
    if (!jobDescription || typeof jobDescription !== "string") {
      res.status(400).json({ error: "jobDescription string is required" });
      return;
    }

    const system = `You are a precise, honest resume-matching engine embedded in ${PROFILE.name}'s portfolio. Compare the RESUME CONTEXT against the JOB DESCRIPTION the visitor pastes in. Respond with STRICT JSON ONLY — no markdown fences, no commentary before or after — matching exactly this shape:
{
  "score": <integer 0-100, honest overall fit>,
  "matched": [<3-6 short strings: concrete skills/experience from the resume that match the JD>],
  "gaps": [<0-4 short strings: things the JD wants that the resume doesn't clearly show>],
  "pitch": "<2-3 sentence tailored pitch, third person, for why this candidate is worth a look for THIS specific role, grounded only in the resume context>"
}
Be honest about the score — this is an early-career/internship candidate, do not inflate fit for senior roles.

RESUME CONTEXT:
${resumeContext}`;

    try {
      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `JOB DESCRIPTION:\n${jobDescription.slice(0, 6000)}`,
          },
        ],
        model: MODEL,
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      let parsed;
      const raw = response.choices[0].message.content || "";
      try {
        const cleaned = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        res.status(502).json({ error: "Could not parse AI response", raw });
        return;
      }

      res.status(200).json(parsed);
    } catch (err) {
      console.error("[match error]", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
    return;
  }

  res.status(400).json({ error: "Unknown mode. Use 'chat' or 'match'." });
}
