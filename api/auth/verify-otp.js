import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  ADMIN_EMAIL,
  getAdminSessionSecret,
  isAuthorizedEmail,
  isCorsPreflight,
  setAuthCorsHeaders,
} from "./shared.js";

const OTP_COOKIE = "owner_otp";
const OTP_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 8;
const verifyAttempts = new Map();

function getCookie(cookieHeader, name) {
  const prefix = `${name}=`;
  const cookie = String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function clearOtpCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${OTP_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}

function json(res, status, body) {
  return res.status(status).json(body);
}

function allowAttempt(ip) {
  const now = Date.now();
  const attempts = (verifyAttempts.get(ip) || []).filter((time) => now - time < OTP_ATTEMPT_WINDOW_MS);
  if (attempts.length >= MAX_VERIFY_ATTEMPTS) {
    verifyAttempts.set(ip, attempts);
    return false;
  }
  attempts.push(now);
  verifyAttempts.set(ip, attempts);
  return true;
}

export default async function handler(req, res) {
  setAuthCorsHeaders(res);
  if (isCorsPreflight(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const { email, otp } = req.body ?? {};
  if (!isAuthorizedEmail(email)) {
    return json(res, 403, { error: "Unauthorized: Access restricted to portfolio owner" });
  }
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return json(res, 400, { error: "Enter the 6-digit verification code." });
  }

  let secret;
  try {
    secret = getAdminSessionSecret();
  } catch (err) {
    console.error("[auth/verify-otp] Configuration error:", err.message);
    return json(res, 503, { error: "Owner sign-in is not configured on the server." });
  }

  const clientIp = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  if (!allowAttempt(clientIp)) {
    clearOtpCookie(res);
    return json(res, 429, { error: "Too many code attempts. Request a new code later." });
  }

  const value = getCookie(req.headers?.cookie, OTP_COOKIE);
  if (!value) {
    return json(res, 401, { error: "The code has expired or is missing. Request a new one." });
  }

  const separator = value.lastIndexOf(".");
  const hash = value.slice(0, separator);
  const expiresAt = Number(value.slice(separator + 1));
  if (!/^[a-f0-9]{64}$/.test(hash) || !Number.isSafeInteger(expiresAt) || Date.now() > expiresAt) {
    clearOtpCookie(res);
    return json(res, 401, { error: "The code has expired. Request a new one." });
  }

  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(`${ADMIN_EMAIL}.${otp}.${expiresAt}`)
    .digest();
  const actualHash = Buffer.from(hash, "hex");
  if (actualHash.length !== expectedHash.length || !crypto.timingSafeEqual(actualHash, expectedHash)) {
    return json(res, 401, { error: "Invalid code. Check the email and try again." });
  }

  try {
    const token = jwt.sign(
      { email: ADMIN_EMAIL, role: "admin" },
      secret,
      { expiresIn: "4h" }
    );
    clearOtpCookie(res);
    return json(res, 200, { success: true, token });
  } catch (err) {
    console.error("[auth/verify-otp] Session signing failed:", err.message);
    return json(res, 503, { error: "Could not create the owner session." });
  }
}
