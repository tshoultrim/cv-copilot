import crypto from "crypto";
import {
  ADMIN_EMAIL,
  getAdminSessionSecret,
  isAuthorizedEmail,
  isCorsPreflight,
  setAuthCorsHeaders,
} from "./shared.js";

const OTP_COOKIE = "owner_otp";
const OTP_TTL_SECONDS = 5 * 60;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const sendAttempts = new Map();

function json(res, status, body) {
  return res.status(status).json(body);
}

function cookieOptions() {
  return `HttpOnly; Path=/; Max-Age=${OTP_TTL_SECONDS}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function allowRequest(ip) {
  const now = Date.now();
  const attempts = (sendAttempts.get(ip) || []).filter((time) => now - time < SEND_WINDOW_MS);
  if (attempts.length >= MAX_SENDS_PER_WINDOW) {
    sendAttempts.set(ip, attempts);
    return false;
  }
  attempts.push(now);
  sendAttempts.set(ip, attempts);
  return true;
}

export default async function handler(req, res) {
  setAuthCorsHeaders(res);
  if (isCorsPreflight(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const { email } = req.body ?? {};
  if (!isAuthorizedEmail(email)) {
    return json(res, 403, { error: "Unauthorized: Access restricted to portfolio owner" });
  }

  let secret;
  try {
    secret = getAdminSessionSecret();
  } catch (err) {
    console.error("[auth/send-otp] Configuration error:", err.message);
    return json(res, 503, { error: "Owner sign-in is not configured on the server." });
  }

  const clientIp = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
  if (!allowRequest(clientIp)) {
    return json(res, 429, { error: "Too many code requests. Try again in 15 minutes." });
  }

  if (process.env.NODE_ENV === "production" && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)) {
    return json(res, 503, { error: "Owner email delivery is not configured on the server." });
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
  const otpHash = crypto
    .createHmac("sha256", secret)
    .update(`${ADMIN_EMAIL}.${otp}.${expiresAt}`)
    .digest("hex");
  const cookieValue = `${otpHash}.${expiresAt}`;
  let delivered = false;

  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "Portfolio Auth <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          subject: "Your portfolio owner sign-in code",
          html: `<div style="font-family:monospace;background:#04060B;color:#fff;padding:32px;border-radius:12px;max-width:420px"><p style="color:#00D2FF;font-size:11px;letter-spacing:3px">SYS.ADMIN // OWNER SIGN-IN</p><p>Your one-time verification code is:</p><p style="font-size:40px;letter-spacing:12px;font-weight:700;color:#00FF87">${otp}</p><p style="font-size:12px;color:#94a3b8">This code expires in five minutes. If you did not request it, ignore this email.</p></div>`,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend returned HTTP ${response.status}: ${await response.text()}`);
      }
      delivered = true;
    } catch (err) {
      console.error("[auth/send-otp] Email delivery failed:", err.message);
    }
  }

  if (!delivered && process.env.NODE_ENV === "production") {
    return json(res, 503, { error: "Could not send the sign-in code. Check the server email configuration." });
  }

  if (!delivered) {
    console.info(`[OWNER AUTH DEV] One-time code for ${ADMIN_EMAIL}: ${otp}`);
  }

  res.setHeader("Set-Cookie", `${OTP_COOKIE}=${cookieValue}; ${cookieOptions()}`);
  return json(res, 200, {
    success: true,
    message: delivered
      ? `A sign-in code was sent to ${ADMIN_EMAIL}.`
      : "Development mode: the sign-in code was written to the Vite server terminal.",
  });
}
