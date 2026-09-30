import jwt from "jsonwebtoken";
import crypto from "crypto";

export const ADMIN_EMAIL = "tshoultrim@gmail.com";
let developmentSessionSecret;

export function setAuthCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export function isCorsPreflight(req, res) {
  if (req.method !== "OPTIONS") return false;
  setAuthCorsHeaders(res);
  res.setHeader("Access-Control-Max-Age", "600");
  res.status(204).end();
  return true;
}

export function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (process.env.OWNER_EMAIL && process.env.OWNER_EMAIL.trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new Error(`OWNER_EMAIL must be set to ${ADMIN_EMAIL}.`);
  }
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "development") {
    if (!developmentSessionSecret) {
      developmentSessionSecret = crypto.randomBytes(48).toString("base64url");
      console.warn("[auth] Using an ephemeral development session secret; owner sessions reset when Vite stops.");
    }
    return developmentSessionSecret;
  }
  throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters.");
}

export function isAuthorizedEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isValidAdminToken(authHeader, secret) {
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) return false;
  try {
    const decoded = jwt.verify(authHeader.slice("Bearer ".length), secret);
    return decoded.role === "admin" && isAuthorizedEmail(decoded.email);
  } catch {
    return false;
  }
}
