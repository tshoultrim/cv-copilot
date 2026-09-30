// Vercel serverless endpoint: POST /api/resume-update
//
// Expects: { data: { PROFILE: {...}, SKILLS: [...] } }
// Requires: Authorization: Bearer <token>
//
// Validates the OTP-issued admin token, merges the provided fields
// with the existing Gist data, and writes the update to GitHub.

import { getAdminSessionSecret, isValidAdminToken } from "./auth/shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let secret;
  try {
    secret = getAdminSessionSecret();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!isValidAdminToken(req.headers.authorization, secret)) {
    return res.status(401).json({ error: "Unauthorized or token expired" });
  }

  const gistId = process.env.GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gistId || !githubToken) {
    return res.status(500).json({ error: "GIST_ID or GITHUB_TOKEN not configured on server" });
  }

  const { data: newPartialData } = req.body || {};
  if (!newPartialData || typeof newPartialData !== "object" || Array.isArray(newPartialData)) {
    return res.status(400).json({ error: "'data' must be a resume object" });
  }

  const allowedFields = new Set([
    "PROFILE",
    "EXPERIENCE",
    "PROJECTS",
    "SKILLS",
    "EDUCATION",
    "CERTIFICATIONS",
  ]);
  const unknownFields = Object.keys(newPartialData).filter((field) => !allowedFields.has(field));
  if (unknownFields.length > 0) {
    return res.status(400).json({ error: `Unsupported resume fields: ${unknownFields.join(", ")}` });
  }

  for (const field of ["EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"]) {
    if (field in newPartialData && !Array.isArray(newPartialData[field])) {
      return res.status(400).json({ error: `${field} must be an array` });
    }
  }
  if ("PROFILE" in newPartialData &&
      (!newPartialData.PROFILE || typeof newPartialData.PROFILE !== "object" || Array.isArray(newPartialData.PROFILE))) {
    return res.status(400).json({ error: "PROFILE must be an object" });
  }
  
  // 1. Fetch current Gist data to merge
  let currentData = {};
  try {
    const upstream = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "portfolio-resume-data"
      }
    });
    
    if (upstream.ok) {
      const gist = await upstream.json();
      const content = gist.files["resume.json"]?.content;
      if (content) currentData = JSON.parse(content);
    } else {
      console.warn("Failed to fetch gist during update, HTTP", upstream.status);
    }
  } catch (err) {
    console.warn("Error fetching gist during update:", err.message);
  }

  // Fallback if Gist is completely empty or invalid
  if (Object.keys(currentData).length === 0) {
    console.warn("Could not read current Gist data. Aborting to prevent overwrite.");
    return res.status(500).json({ error: "Could not read existing resume data. Aborting update to prevent data loss." });
  }

  // 2. Merge data
  const mergedData = { ...currentData, ...newPartialData };
  
  // Security: never overwrite NODES, it's strictly local/static
  delete mergedData.NODES;
  delete mergedData.PIPELINE_SUMMARY;

  // 3. Write back to Gist via PATCH
  try {
    const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `token ${githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "portfolio-resume-data",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        files: {
          "resume.json": {
            content: JSON.stringify(mergedData, null, 2)
          }
        }
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`GitHub API error: ${patchRes.status} - ${errText}`);
    }

    res.status(200).json({ success: true, data: mergedData });
  } catch (err) {
    console.error("Gist update failed:", err);
    res.status(500).json({ error: `Failed to update Gist: ${err.message}` });
  }
}
