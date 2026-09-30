// Vite dev-server plugin — intercepts /api/* requests in local dev.
// In production (Vercel), api/*.js files run as serverless functions.
// In local dev, Vite has no serverless runtime — this plugin bridges the gap.
//
// Handled routes:
//   POST /api/chat           → SSE streaming AI chat (with keyword fallback)
//   GET  /api/resume-data    → live resume JSON (Gist proxy or static fallback)
//   GET  /api/github-activity → proxied GitHub events

export default function viteApiPlugin(env = process.env) {
  // Propagate env vars to process.env so SSR-loaded handler modules can read them
  const envKeys = [
    "GROQ_API_KEY",
    "VITE_RESUME_GIST_URL",
    "VITE_GITHUB_USERNAME",
    "GITHUB_TOKEN",
    "GIST_ID",
    "ADMIN_SESSION_SECRET",
    "OWNER_EMAIL",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
  ];
  for (const key of envKeys) {
    if (env[key]) process.env[key] = env[key];
  }

  return {
    name: "vite-api-plugin",
    configureServer(server) {

      // ── Generic GET handler for /api/resume-data and /api/github-activity ──
      server.middlewares.use(async function apiGetMiddleware(req, res, next) {
        const GET_ROUTES = [
          "/api/resume-data",
          "/api/github-activity",
          "/api/resume-file",
          "/api/resume/download-pdf",
          "/api/auth/session",
        ];
        // strip query string for matching
        const pathname = req.url?.split("?")[0];
        if (!GET_ROUTES.includes(pathname) || req.method !== "GET") return next();

        try {
          const handlerModule = await server.ssrLoadModule(`${pathname}.js`);
          const handler = handlerModule.default;

          // Parse query params
          const url = new URL(req.url, "http://localhost");
          const query = Object.fromEntries(url.searchParams.entries());

          const mockReq = { method: "GET", query, headers: req.headers, socket: req.socket };
          const mockRes = {
            statusCode: 200,
            status(code) { this.statusCode = code; res.statusCode = code; return this; },
            setHeader(k, v) { res.setHeader(k, v); },
            json(data) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(data));
            },
            send(data) { res.end(data); },
            end(data) { res.end(data); },
          };

          await handler(mockReq, mockRes);
        } catch (err) {
          console.error(`[viteApiPlugin] ${req.url} error:`, err.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });

      // ── Generic POST handler for resume and owner authentication APIs ──
      server.middlewares.use(async function apiPostMiddleware(req, res, next) {
        const POST_ROUTES = [
          "/api/resume-update",
          "/api/resume/update",
          "/api/asset-upload",
          "/api/auth/send-otp",
          "/api/auth/verify-otp",
          "/api/auth/session",
        ];
        const pathname = req.url?.split("?")[0];
        if (!POST_ROUTES.includes(pathname)) return next();
        if (req.method === "OPTIONS" && pathname.startsWith("/api/auth/")) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
          res.setHeader("Access-Control-Max-Age", "600");
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") return next();

        let bodyStr = "";
        req.on("data", (chunk) => { bodyStr += chunk.toString(); });
        req.on("end", async () => {
          let body = {};
          try {
            if (bodyStr) body = JSON.parse(bodyStr);
          } catch (e) {
            console.error("Failed to parse JSON body:", e);
          }

          try {
            const handlerModule = await server.ssrLoadModule(`${pathname}.js`);
            const handler = handlerModule.default;

            const mockReq = { method: "POST", headers: req.headers, body, socket: req.socket };
            const mockRes = {
              statusCode: 200,
              status(code) { this.statusCode = code; res.statusCode = code; return this; },
              setHeader(k, v) { res.setHeader(k, v); },
              json(data) {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              },
              end(data) { res.end(data); },
            };

            await handler(mockReq, mockRes);
          } catch (err) {
            console.error(`[viteApiPlugin] ${req.url} error:`, err.message);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });
      });

      // ── POST /api/chat handler (existing, with SSE + fallback) ──
      server.middlewares.use(function apiChatMiddleware(req, res, next) {
        if (req.url !== "/api/chat" || req.method !== "POST") {
          return next();
        }

        // Collect request body
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid JSON" }));
            return;
          }

          const apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
          const hasValidKey =
            apiKey &&
            apiKey !== "gsk-your-key-here" &&
            apiKey.startsWith("gsk_");

          if (hasValidKey) {
            // Forward to the real Groq-powered handler.
            // For chat mode the handler writes SSE frames directly to `res`,
            // so we give it a mockReq/mockRes that delegates straight through
            // to the real Node `res` — no buffering, no JSON wrapper.
            try {
              const handlerModule = await server.ssrLoadModule("/api/chat.js");
              const handler = handlerModule.default;

              const mockReq = {
                method: "POST",
                body: parsed,
                // Expose event emitter so the handler can listen for "close"
                on: (event, cb) => req.on(event, cb),
              };

              // SSE-transparent mock: delegate write/end/headers to the real res
              const mockRes = {
                statusCode: 200,
                // SSE path: handler calls writeHead + write + end directly
                writeHead(code, headers) {
                  res.statusCode = code;
                  if (headers) {
                    for (const [k, v] of Object.entries(headers)) {
                      res.setHeader(k, v);
                    }
                  }
                },
                flushHeaders() {
                  // no-op in Vite dev (headers already sent on first write)
                },
                write(chunk) {
                  res.write(chunk);
                },
                end(chunk) {
                  if (chunk) res.write(chunk);
                  res.end();
                },
                // JSON path (match mode): handler calls .status().json()
                status(code) {
                  this.statusCode = code;
                  res.statusCode = code;
                  return this;
                },
                json(data) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify(data));
                },
              };

              await handler(mockReq, mockRes);
            } catch (err) {
              console.error("API handler error:", err);
              // Only write an error response if headers haven't been sent yet
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message || "Server error" }));
              }
            }
          } else {
            // Fallback: keyword-based search over resume data
            // Chat mode must emit SSE; match mode stays JSON.
            try {
              const { mode } = parsed;

              if (mode === "chat") {
                const lastUserMessage = [...(parsed.messages || [])]
                  .reverse()
                  .find((m) => m.role === "user");
                const query = lastUserMessage?.content || "";
                const reply = fallbackChat(query);

                res.statusCode = 200;
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("Connection", "keep-alive");
                // Emit a single log + single token + done (mirrors real SSE shape)
                res.write(
                  `event: log\ndata: ${JSON.stringify({ text: "No API key — using local fallback..." })}\n\n`
                );
                res.write(
                  `event: token\ndata: ${JSON.stringify({ text: reply })}\n\n`
                );
                res.write(`event: done\ndata: {}\n\n`);
                res.end();
              } else if (mode === "match") {
                const result = fallbackMatch(parsed.jobDescription || "");
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(result));
              } else {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    error: "Unknown mode. Use 'chat' or 'match'.",
                  })
                );
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });
      });
    },
  };
}

// ——— Inline resume data for the fallback (avoids ESM import issues) ———

const PROFILE_NAME = "Tshoultrim Dorji";

const RESUME_TEXT = `
Name: Tshoultrim Dorji
Location: Thimphu, Bhutan
Tagline: BCA – Data Science student, Chandigarh University (5th Semester)
Pitch: Seeking a 6th-semester internship in Data Science / AI. I bring a working foundation in web development and network administration, built through real jobs and national service, into a growing focus on Python, machine learning and data visualization.
Highlights: De-suung Zhabtog pin, awarded by His Majesty The King for national service | Certificate from HRH Prince Jigyel Ugyen Wangchuck — Tour of the Dragon volunteer | 6th Coronation Marathon, certificate of participation — Jakar, Bumthang

EXPERIENCE:
- Web Developer & IT Support (Employee) @ GreenCyberTech (Apr 2024 – Oct 2024): Continued at GreenCyberTech as a full-time employee after the internship, taking on greater ownership of web development and IT support work. Supported website development and maintenance, and handled day-to-day IT troubleshooting.
- Web Developer & IT Support (Internship) @ GreenCyberTech (Jan 2024 – Mar 2024): Completed a certified 3-month internship, gaining hands-on exposure to real-world web development and IT support projects.
- Web Developer & Network Support @ De-suung Headquarter (Aug 2022 – 2023): Developed and maintained web pages, contributing to the organization's digital presence. Provided network support, including configuration and troubleshooting of network systems. Assisted colleagues and staff with day-to-day IT and connectivity issues. Applied foundational programming and database knowledge to support internal projects.

PROJECTS:
- Power BI Dashboard — University Project [Completed]: Built a Power BI dashboard as part of a university project, analyzing and visualizing data to support data-driven decision-making.
- Agentic HR System [In Progress]: Building a full agentic OS-based HR system, while deepening skills in Data Science, Machine Learning and AI.

SKILLS:
Python (Data Science), Machine Learning (Data Science), AI Tools (Data Science), Data Science Fundamentals (Data Science), Power BI (Visualization), HTML (Web), CSS (Web), JavaScript (Web), Database Design (Web), Network Configuration (Networking), Network Troubleshooting (Networking), Cisco CCNA (Networking)

EDUCATION:
- BCA – Data Science, Chandigarh University (2023 – 2027, 5th Semester)
- Higher Secondary School (Class XII), Jakar Higher Secondary School (Feb 2019 – Dec 2019)

CERTIFICATIONS:
- Internship Certificate — GreenCyberTech (3-Month Internship, Jan–Mar 2024)
- ICT: Foundation — Gyalpozhing College of Information Technology
- Introduction to Coding — DSP Training Centre, Yonphula
- Python Programming and Database Fundamentals — BETA Park, Thimphu
- Cisco Certified Network Associate (CCNA) — Royal Institute of Management, Thimphu
- Participation Certificate, SAP Hackathon — Chandigarh University, Punjab, India
- Generative AI Mastermind — Outskill, India
- AI Tools Online Workshop — be10x, India

CAREER TIMELINE:
2022 — Began national service with De-suung Headquarter as Web Developer & Network Support
2024 — Interned, then worked full-time at GreenCyberTech in web development & IT support
2023–2027 — Reading BCA in Data Science at Chandigarh University
Now — Building an agentic HR system while applying for a 6th-semester Data Science / AI internship
`.trim();

const SKILL_NAMES = [
  "Python",
  "Machine Learning",
  "AI Tools",
  "Data Science Fundamentals",
  "Power BI",
  "HTML",
  "CSS",
  "JavaScript",
  "Database Design",
  "Network Configuration",
  "Network Troubleshooting",
  "Cisco (CCNA)",
];

function fallbackChat(query) {
  const q = query.toLowerCase();
  const sections = RESUME_TEXT.split("\n\n");
  const matches = [];

  for (const section of sections) {
    const sectionLower = section.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    const score = words.reduce(
      (acc, word) => acc + (sectionLower.includes(word) ? 1 : 0),
      0
    );
    if (score > 0) {
      matches.push({ section, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  if (matches.length === 0) {
    return `I don't have specific information about that in ${PROFILE_NAME.split(" ")[0]}'s resume.`;
  }

  return `I found some relevant information in the resume, but the AI backend is currently offline locally. Please configure GROQ_API_KEY in your environment to enable full conversational AI features.`;
}

function fallbackMatch(jobDescription) {
  const jdLower = jobDescription.toLowerCase();
  const matched = [];
  const gaps = [];

  for (const skill of SKILL_NAMES) {
    if (jdLower.includes(skill.toLowerCase())) {
      matched.push(skill);
    }
  }

  const commonReqs = [
    "Docker", "Kubernetes", "AWS", "Azure", "React", "Node.js",
    "SQL Server", "Spark", "Hadoop", "Scala", "R programming",
  ];
  for (const req of commonReqs) {
    if (
      jdLower.includes(req.toLowerCase()) &&
      !SKILL_NAMES.some((s) => s.toLowerCase().includes(req.toLowerCase()))
    ) {
      gaps.push(req);
    }
  }

  const score = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        (matched.length / Math.max(matched.length + gaps.length, 1)) * 100
      )
    )
  );

  return {
    score,
    matched: matched.slice(0, 6),
    gaps: gaps.slice(0, 4),
    pitch: `${PROFILE_NAME} is an early-career candidate with ${matched.length} matching skill(s). Seeking a 6th-semester internship in Data Science / AI with a working foundation in web development and network administration.`,
  };
}
