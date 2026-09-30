// Vercel serverless endpoint: POST /api/asset-upload
//
// Accepts base64-encoded profile pictures and resume PDFs,
// stores them in the GitHub Gist used for resume data.
//
// Expects: { type: "avatar" | "resume", data: "<base64>", filename: "photo.jpg" }
// Requires: Authorization: Bearer <token>

import { getAdminSessionSecret, isValidAdminToken } from "./auth/shared.js";

// Size limits in bytes (before base64 encoding)
const LIMITS = {
  avatar: 2 * 1024 * 1024,   // 2 MB
  resume: 5 * 1024 * 1024,   // 5 MB
};

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function detectMimeFromBase64(dataStr) {
  // data:image/png;base64,xxxx → image/png
  const match = dataStr.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}

function getBase64Size(dataStr) {
  // Strip data-URL prefix if present
  const b64 = dataStr.includes(",") ? dataStr.split(",")[1] : dataStr;
  // Base64 encodes 3 bytes per 4 chars
  const padding = (b64.match(/=/g) || []).length;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let sessionSecret;
  try {
    sessionSecret = getAdminSessionSecret();
  } catch (err) {
    return res.status(503).json({ error: err.message });
  }

  if (!isValidAdminToken(req.headers.authorization, sessionSecret)) {
    return res.status(401).json({ error: "Unauthorized or token expired" });
  }

  const gistId = process.env.GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gistId || !githubToken) {
    return res.status(500).json({ error: "GIST_ID or GITHUB_TOKEN not configured" });
  }

  const { type, data, filename } = req.body || {};

  if (!type || typeof data !== "string" || !data) {
    return res.status(400).json({ error: "Missing 'type' or 'data' in request body" });
  }

  if (type !== "avatar" && type !== "resume") {
    return res.status(400).json({ error: "Invalid type. Must be 'avatar' or 'resume'" });
  }

  // ── Validate file size ──────────────────────────────────────────────────────
  const byteSize = getBase64Size(data);
  if (byteSize > LIMITS[type]) {
    const limitMB = LIMITS[type] / (1024 * 1024);
    return res.status(400).json({ 
      error: `File too large. Maximum ${limitMB}MB allowed, got ${(byteSize / (1024 * 1024)).toFixed(1)}MB` 
    });
  }

  // ── Validate MIME type ──────────────────────────────────────────────────────
  if (type === "avatar") {
    const mime = detectMimeFromBase64(data);
    if (!mime || !ALLOWED_IMAGE_TYPES.includes(mime)) {
      return res.status(400).json({ 
        error: `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}` 
      });
    }
  }

  if (type === "resume") {
    const mime = detectMimeFromBase64(data);
    if (mime && mime !== "application/pdf") {
      return res.status(400).json({ error: "Resume must be a PDF file" });
    }
  }

  try {
    // 1. Fetch current Gist
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "portfolio-asset-upload",
      },
    });

    if (!gistRes.ok) {
      throw new Error(`Failed to fetch Gist: HTTP ${gistRes.status}`);
    }

    const gist = await gistRes.json();

    // 2. Build patch based on upload type
    const patchFiles = {};

    if (type === "avatar") {
      // Store avatar data-URL in the resume.json PROFILE.avatar field
      const currentContent = gist.files["resume.json"]?.content;
      let resumeData = {};
      if (currentContent) {
        try { resumeData = JSON.parse(currentContent); } catch (e) { /* empty */ }
      }

      resumeData.PROFILE = resumeData.PROFILE || {};
      resumeData.PROFILE.avatar = data; // full data-URL string

      patchFiles["resume.json"] = {
        content: JSON.stringify(resumeData, null, 2),
      };
    } else if (type === "resume") {
      // Store resume PDF base64 in a separate Gist file
      const rawB64 = data.includes(",") ? data.split(",")[1] : data;
      patchFiles["resume_pdf.b64"] = {
        content: rawB64,
      };

      // Also update PROFILE.resumeFile to point to the API endpoint
      const currentContent = gist.files["resume.json"]?.content;
      let resumeData = {};
      if (currentContent) {
        try { resumeData = JSON.parse(currentContent); } catch (e) { /* empty */ }
      }

      resumeData.PROFILE = resumeData.PROFILE || {};
      resumeData.PROFILE.resumeFile = "/api/resume-file";

      patchFiles["resume.json"] = {
        content: JSON.stringify(resumeData, null, 2),
      };
    }

    // 3. PATCH the Gist
    const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "portfolio-asset-upload",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: patchFiles }),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`GitHub API error: ${patchRes.status} - ${errText}`);
    }

    const updatedResumeContent = patchFiles["resume.json"]?.content;
    const updatedResume = updatedResumeContent ? JSON.parse(updatedResumeContent) : null;

    res.status(200).json({
      success: true, 
      type,
      ...(type === "avatar" && updatedResume ? { data: { PROFILE: updatedResume.PROFILE } } : {}),
      message: type === "avatar" 
        ? "Profile picture updated successfully" 
        : "Resume PDF uploaded successfully"
    });
  } catch (err) {
    console.error("[asset-upload] Error:", err);
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
}
