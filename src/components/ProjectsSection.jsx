import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchUserRepos,
  fetchRepoReadme,
  extractReadmeSummary,
  relativeTime,
} from "../utils/githubService";

// ─── Constants ────────────────────────────────────────────────────────────────
const GITHUB_USERNAME = "tshoultrim";
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // refresh every 5 min

// ─── Language colour map (GitHub colours) ────────────────────────────────────
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "Jupyter Notebook": "#DA5B0B",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LanguageDot({ lang }) {
  if (!lang) return null;
  const color = LANG_COLORS[lang] ?? "#6b7280";
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[11px] text-mist/70 font-mono">{lang}</span>
    </span>
  );
}

function StarCount({ count }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-mist/60 font-mono">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400/70">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {count}
    </span>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 animate-pulse space-y-3">
      <div className="h-3.5 w-2/3 rounded bg-slate-700/60" />
      <div className="h-2.5 w-full rounded bg-slate-800/80" />
      <div className="h-2.5 w-4/5 rounded bg-slate-800/80" />
      <div className="flex gap-3 pt-1">
        <div className="h-2 w-12 rounded bg-slate-700/40" />
        <div className="h-2 w-8 rounded bg-slate-700/40" />
        <div className="h-2 w-14 rounded bg-slate-700/40" />
      </div>
    </div>
  );
}

// ─── Single project card ──────────────────────────────────────────────────────
function ProjectCard({ repo }) {
  const [readme, setReadme] = useState(null);
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [readmeUnavailable, setReadmeUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReadmeLoading(true);
    fetchRepoReadme(repo.fullName)
      .then((text) => {
        if (!cancelled) setReadme(extractReadmeSummary(text, 220));
      })
      .catch(() => {
        if (!cancelled) setReadmeUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setReadmeLoading(false);
      });
    return () => { cancelled = true; };
  }, [repo.fullName]);

  const description = readme || repo.description || "No description available.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition-all duration-300 hover:border-cyan-500/20 hover:bg-slate-900/70 hover:shadow-[0_0_20px_rgba(34,211,238,0.06)]"
    >
      {/* Top: name + external link */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-cyan-400/60">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] font-semibold text-white truncate hover:text-cyan-400 transition-colors"
          >
            {repo.name}
          </a>
        </div>
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md p-1 text-mist/40 hover:text-cyan-400 transition-colors"
          aria-label="Open on GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* Description / README */}
      <div className="mb-3 flex-1">
        {readmeLoading ? (
          <div className="space-y-1.5 animate-pulse">
            <div className="h-2 w-full rounded bg-slate-800" />
            <div className="h-2 w-4/5 rounded bg-slate-800" />
          </div>
        ) : (
          <>
            <p className="text-[12px] text-mist/70 leading-relaxed line-clamp-3">{description}</p>
            {readmeUnavailable && (
              <p className="mt-1 font-mono text-[9px] text-amber-300/70">README unavailable; showing repository summary.</p>
            )}
          </>
        )}
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 font-mono text-[9px] text-mist/60 uppercase tracking-wide"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer metadata */}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3 mt-auto">
        <LanguageDot lang={repo.language} />
        <StarCount count={repo.stars} />
        <span className="ml-auto font-mono text-[10px] text-mist/40">
          {repo.updatedAgo}
        </span>
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
          >
            Live ↗
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="rounded-full border border-red-500/30 bg-red-500/10 p-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="font-mono text-sm text-red-400">Failed to sync repos</p>
        <p className="font-mono text-[11px] text-mist/50 mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 font-mono text-[11px] text-cyan-400 transition-colors hover:bg-cyan-500/20"
      >
        Retry Sync
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProjectsSection() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserRepos(GITHUB_USERNAME);
      setRepos(data);
      setLastSynced(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(load, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold text-white tracking-wide">
              Open Source
              <span className="ml-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-400 uppercase tracking-widest">
                Auto-Synced
              </span>
            </h2>
            <a
              href="https://github.com/tshoultrim/cv-copilot"
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-mist/50 transition-colors hover:text-cyan-400"
            >
              github.com/tshoultrim/cv-copilot
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          {!loading && !error && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-mist/50">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {lastSynced ? `Synced ${relativeTime(lastSynced.toISOString())}` : "Live"}
            </span>
          )}

          {/* Manual refresh */}
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900/50 p-1.5 text-mist/50 transition-all hover:border-cyan-500/30 hover:text-cyan-400 disabled:opacity-40"
            aria-label="Refresh repos"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={loading ? "animate-spin" : ""}
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : loading && repos.length === 0 ? (
        // Initial skeleton grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo, i) => (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <ProjectCard repo={repo} />
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Footer count */}
      {!loading && !error && repos.length > 0 && (
        <div className="mt-6 text-center">
          <a
            href="https://github.com/tshoultrim/cv-copilot"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-mono text-[11px] text-mist/50 hover:text-cyan-400 transition-colors"
          >
            Showing {repos.length} public repositories · View cv-copilot
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}
    </section>
  );
}
