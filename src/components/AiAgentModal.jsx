import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { PROFILE } from "../data/resumeData";
import { useUIStore } from "../store";

// ─── Match mode helper ────────────────────────────────────────────────────────
async function postMatch(payload) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    clamped >= 70 ? "#00FF87" : clamped >= 40 ? "#FFC857" : "#FF5C7A";

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold text-white">
        {clamped}
      </span>
    </div>
  );
}

// ─── Typing Indicator (Replaces terminal log) ─────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 w-fit">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
    </div>
  );
}

// ─── Chat tab ─────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! Ask me anything about ${PROFILE.name.split(" ")[0]}'s experience, skills, or projects — I'll answer straight from the resume.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingReply, setStreamingReply] = useState("");

  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, streamingReply]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    setStreamingReply("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: next }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventName = "message";
          let dataStr = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event: ")) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }

          let payload = {};
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventName === "token") {
            accumulated += payload.text;
            setStreamingReply(accumulated);
          } else if (eventName === "done") {
            setMessages((m) => [
              ...m,
              { role: "assistant", content: accumulated },
            ]);
            setStreamingReply("");
          } else if (eventName === "error") {
            throw new Error(payload.message || "Stream error");
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setStreamingReply("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
              m.role === "user"
                ? "ml-auto bg-cyan-500/20 text-white border border-cyan-500/30"
                : "bg-slate-800/80 text-mist border border-white/5"
            }`}
          >
            {m.role === "user" ? m.content : <MarkdownMessage content={m.content} />}
          </div>
        ))}

        {loading && (
          <div className="max-w-[85%]">
            {streamingReply ? (
              <div className="rounded-xl bg-slate-800/80 border border-white/5 px-3 py-2 text-[13px] leading-relaxed text-mist shadow-sm">
                <MarkdownMessage content={streamingReply} />
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-cyan-400 align-middle shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
            ) : (
              <TypingIndicator />
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400 shadow-sm">
            {error}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-950/80 p-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about experience, projects, or skills..."
            className="min-w-0 flex-grow rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-[13px] text-white placeholder:text-mist/50 focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
          <button
            onClick={send}
            disabled={loading}
            className="flex-shrink-0 rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-4 py-2 font-mono text-[11px] font-semibold text-cyan-400 transition-all hover:bg-cyan-500/30 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkdownMessage({ content }) {
  return (
    <div className="space-y-2.5 break-words [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:pl-0.5 [&_strong]:font-semibold [&_strong]:text-white [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-cyan-300 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-cyan-300 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-purple-300 [&_a]:text-cyan-300 [&_a]:underline">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function MatchResult({ result }) {
  const label =
    result.score >= 80 ? "Strong Candidate" :
    result.score >= 60 ? "Potential Match" :
    "Stretch Match";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
        <ScoreRing score={result.score} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-purple-300">Job Match</p>
          <p className="mt-1 font-semibold text-white">{result.score}% Match · {label}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-mist">{result.pitch}</p>
        </div>
      </div>
      {result.matched?.length > 0 && (
        <section>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">Matching Core Skills</h3>
          <div className="flex flex-wrap gap-2">
            {result.matched.map((item, i) => (
              <span key={`${item}-${i}`} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">{item}</span>
            ))}
          </div>
        </section>
      )}
      {result.gaps?.length > 0 && (
        <section>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">Gaps to Consider</h3>
          <ul className="list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-mist/80">
            {result.gaps.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Match tab ────────────────────────────────────────────────────────────────
function MatchTab() {
  const [jd, setJd] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Paste a job description below and I’ll compare its requirements with the verified resume data." },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  const analyze = async () => {
    if (!jd.trim() || loading) return;
    const jobDescription = jd.trim();
    setMessages((items) => [...items, { role: "user", content: jobDescription }]);
    setJd("");
    setLoading(true);
    setError(null);
    try {
      const data = await postMatch({ mode: "match", jobDescription });
      setMessages((items) => [...items, { role: "assistant", result: data }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[90%] rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed ${
              message.role === "user"
                ? "ml-auto border-purple-500/30 bg-purple-500/10 text-white whitespace-pre-wrap"
                : "border-white/5 bg-slate-800/80 text-mist"
            }`}
          >
            {message.result ? <MatchResult result={message.result} /> : message.content}
          </motion.div>
        ))}
        {loading && <TypingIndicator />}
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</div>
        )}
      </div>
      <form
        onSubmit={(event) => { event.preventDefault(); analyze(); }}
        className="shrink-0 border-t border-slate-800 bg-slate-950/90 p-3 sm:p-4"
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={jd}
            onChange={(event) => setJd(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                analyze();
              }
            }}
            placeholder="Paste job description to evaluate candidate fit..."
            className="scroll-thin min-h-11 max-h-36 min-w-0 flex-1 resize-y rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-[13px] text-white placeholder:text-mist/50 focus:border-purple-400/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !jd.trim()}
            className="shrink-0 rounded-lg border border-purple-500/30 bg-purple-500/20 px-3 py-2.5 font-mono text-[11px] text-purple-300 transition hover:bg-purple-500/30 disabled:opacity-40"
          >
            Analyze
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Root panel ───────────────────────────────────────────────────────────────
export default function AiAgentModal() {
  const open = useUIStore((s) => s.aiPanelOpen);
  const close = useUIStore((s) => s.closeAiPanel);
  const [tab, setTab] = useState("chat");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-stretch justify-stretch overflow-hidden bg-slate-950/90 p-0 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden border border-slate-800 bg-slate-950/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all duration-300"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 p-5">
              <div>
                <p className="font-mono text-sm font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  SYS.ADMIN // AI AGENT
                </p>
                <p className="font-mono text-[10px] text-mist/70 mt-1 tracking-wider uppercase">
                  grounded in {PROFILE.name.split(" ")[0]}'s resume data
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-full p-2 text-mist/60 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex shrink-0 gap-3 border-b border-slate-800 bg-slate-900/50 px-5 py-3 font-mono text-xs">
              <button
                onClick={() => setTab("chat")}
                className={`flex-1 rounded-lg py-2.5 transition-all duration-300 ${
                  tab === "chat"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-mist hover:text-white border border-transparent hover:bg-slate-800/50"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setTab("match")}
                className={`flex-1 rounded-lg py-2.5 transition-all duration-300 ${
                  tab === "match"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm"
                    : "text-mist hover:text-white border border-transparent hover:bg-slate-800/50"
                }`}
              >
                Job Match
              </button>
            </div>

            {/* Content Area */}
            <div className="min-h-0 flex-1 bg-transparent">
              {tab === "chat" ? <ChatTab /> : <MatchTab />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
