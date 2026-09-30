import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, selectIsAdmin } from "../store";

const OWNER_EMAIL = "tshoultrim@gmail.com";

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, setEditToken } = useUIStore();
  const isAdmin = useUIStore(selectIsAdmin);
  const [otp, setOtp] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleClose = () => {
    closeAuthModal();
    setOtp("");
    setCodeRequested(false);
    setError("");
    setMessage("");
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: OWNER_EMAIL }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Unauthorized: Access restricted to portfolio owner"
            : data.error || "Could not request a sign-in code."
        );
      }
      setCodeRequested(true);
      setMessage(data.message || `A sign-in code was sent to ${OWNER_EMAIL}.`);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not reach the sign-in service. Make sure the portfolio server is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: OWNER_EMAIL, otp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        throw new Error(data.error || "Code verification failed. Request a new code.");
      }
      setEditToken(data.token);
      setMessage("Owner session verified. Resume editing controls are now enabled.");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Could not reach the sign-in service. Make sure the portfolio server is running."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {authModalOpen && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
          onClick={(event) => event.target === event.currentTarget && handleClose()}
        >
          <motion.div
            key="auth-card"
            initial={{ scale: 0.95, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 16, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-[0_0_60px_rgba(0,210,255,0.1)] backdrop-blur-xl"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-400">
                  SYS.ADMIN // OWNER SIGN-IN
                </p>
                <h2 className="font-mono text-lg font-bold text-white">Private access</h2>
                <p className="mt-1 font-mono text-[11px] text-mist/50">
                  {codeRequested ? "Enter the one-time code sent to the owner" : "Owner-only one-time sign-in for"}
                  <br />
                  <span className="text-cyan-300">{OWNER_EMAIL}</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-0.5 rounded-full p-1.5 text-mist/50 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Close sign-in"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isAdmin ? (
              <div className="space-y-3">
                <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-[11px] text-emerald-300">
                  Owner access verified. You can now manage resume content and profile media.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-lg border border-slate-700 py-2.5 font-mono text-xs text-mist/70 transition hover:text-white"
                >
                  Continue to dashboard
                </button>
              </div>
            ) : codeRequested ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="owner-otp" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-mist/60">
                    6-digit verification code
                  </label>
                  <input
                    id="owner-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoFocus
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-center font-mono text-xl tracking-[0.5em] text-white outline-none transition-colors focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
                {message && <p role="status" className="font-mono text-[11px] text-emerald-300">{message}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setCodeRequested(false); setOtp(""); setError(""); setMessage(""); }}
                    className="rounded-lg border border-slate-700 px-4 py-3 font-mono text-xs text-mist/70 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-3 font-mono text-sm font-semibold text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRequestCode} className="space-y-4">
                {message && <p role="status" className="font-mono text-[11px] text-emerald-300">{message}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-3 font-mono text-sm font-semibold text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Email me a sign-in code"}
                </button>
              </form>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <p className="font-mono text-[11px] text-red-300">{error}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
