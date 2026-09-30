// Vercel serverless endpoint: GET /api/resume-file
//
// Serves the uploaded resume PDF stored in the GitHub Gist as base64.
// Falls back to redirecting to /resume.pdf (static file) if no upload exists.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gistId = process.env.GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gistId || !githubToken) {
    // No Gist configured — redirect to static file
    res.setHeader("Location", "/resume.pdf");
    return res.status(302).end();
  }

  try {
    const gistRes = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        "Authorization": `token ${githubToken}`,
        "User-Agent": "portfolio-resume-file",
      },
    });

    if (!gistRes.ok) {
      throw new Error(`Gist fetch failed: HTTP ${gistRes.status}`);
    }

    const gist = await gistRes.json();
    const fileData = gist.files["resume_pdf.b64"];
    let b64Content = fileData?.content;

    if (!b64Content && !fileData) {
      // No uploaded resume — redirect to static file
      res.setHeader("Location", "/resume.pdf");
      return res.status(302).end();
    }

    if (fileData?.truncated) {
      const rawRes = await fetch(fileData.raw_url);
      if (!rawRes.ok) throw new Error("Failed to fetch raw truncated file");
      b64Content = await rawRes.text();
    }

    // Decode base64 → binary PDF
    const pdfBuffer = Buffer.from(b64Content.trim(), "base64");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Tshoultrim_Dorji_Resume.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=30");

    // For Vercel serverless, we send the buffer; for the Vite dev plugin, use end()
    if (typeof res.send === "function") {
      res.send(pdfBuffer);
    } else {
      res.end(pdfBuffer);
    }
  } catch (err) {
    console.error("[resume-file] Error:", err.message);
    // Fallback to static on any error
    res.setHeader("Location", "/resume.pdf");
    res.status(302).end();
  }
}
