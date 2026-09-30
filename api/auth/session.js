import { getAdminSessionSecret, isValidAdminToken, setAuthCorsHeaders, isCorsPreflight } from "./shared.js";

export default function handler(req, res) {
  setAuthCorsHeaders(res);
  if (isCorsPreflight(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const secret = getAdminSessionSecret();
    if (!isValidAdminToken(req.headers?.authorization, secret)) {
      return res.status(401).json({ authenticated: false });
    }
    return res.status(200).json({ authenticated: true });
  } catch (err) {
    console.error("[auth/session] Configuration error:", err.message);
    return res.status(503).json({ error: "Owner sign-in is not configured on the server." });
  }
}
