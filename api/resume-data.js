// Vercel serverless endpoint: GET /api/resume-data
//
// Fetches live resume JSON from the configured Gist or VITE_RESUME_GIST_URL.
// Falls back to bundled resumeData.js so the site never goes blank.
//
// Responses use no-store so a saved owner edit is reflected immediately.
//
// How to set up the Gist:
//   1. Go to https://gist.github.com and create a new PUBLIC gist named resume.json
//   2. Paste the JSON shape shown below
//   3. Click "Raw" and copy the URL
//   4. Add VITE_RESUME_GIST_URL=<raw-url> to .env.local and Vercel environment vars
//
// Gist JSON shape (only text fields — omit NODES, it contains Math.PI):
// {
//   "PROFILE":         { "name":"...", "location":"...", "tagline":"...", "pitch":"...", "highlights":[], "resumeFile":"..." },
//   "EXPERIENCE":      [{ "role":"...", "org":"...", "dates":"...", "points":[] }],
//   "PROJECTS":        [{ "name":"...", "status":"...", "description":"..." }],
//   "SKILLS":          [{ "name":"...", "group":"...", "level": 0-100 }],
//   "EDUCATION":       [{ "school":"...", "program":"...", "dates":"..." }],
//   "CERTIFICATIONS":  ["..."]
// }

import * as staticData from "../src/data/resumeData.js";

const STATIC_PAYLOAD = {
  PROFILE: staticData.PROFILE,
  EXPERIENCE: staticData.EXPERIENCE,
  PROJECTS: staticData.PROJECTS,
  SKILLS: staticData.SKILLS,
  EDUCATION: staticData.EDUCATION,
  CERTIFICATIONS: staticData.CERTIFICATIONS,
  // NOTE: NODES is intentionally excluded — it contains Math.PI and is always static.
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const gistId = process.env.GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;
  const gistUrl = process.env.VITE_RESUME_GIST_URL;

  if (gistId && githubToken) {
    try {
      const upstream = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "Cache-Control": "no-cache",
          "User-Agent": "portfolio-resume-data",
        },
        cache: "no-store",
      });
      if (!upstream.ok) throw new Error(`Gist HTTP ${upstream.status}`);
      const gist = await upstream.json();
      const content = gist.files?.["resume.json"]?.content;
      if (!content) throw new Error("Configured Gist is missing resume.json");
      const data = JSON.parse(content);
      delete data.PIPELINE_SUMMARY;

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(data);
      return;
    } catch (err) {
      console.warn("[resume-data] Authenticated Gist fetch failed:", err.message);
    }
  }

  if (gistUrl) {
    try {
      const upstream = await fetch(gistUrl, {
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "portfolio-resume-data",
        },
        cache: "no-store",
      });
      if (!upstream.ok) throw new Error(`Gist HTTP ${upstream.status}`);
      const data = await upstream.json();
      delete data.PIPELINE_SUMMARY;
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(data);
      return;
    } catch (err) {
      console.warn("[resume-data] Public Gist fetch failed, using static:", err.message);
    }
  }

  // Static fallback
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(STATIC_PAYLOAD);
}
