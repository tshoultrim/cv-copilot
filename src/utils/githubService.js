// ─── GitHub Service ────────────────────────────────────────────────────────────
// Fetches public repos + parses README.md for a given GitHub username.
// Results are cached in-memory per session to avoid rate-limiting on re-renders.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const repoCache = new Map();
const readmeCache = new Map();

/**
 * Returns a human-readable relative timestamp.
 * e.g. "2d ago", "19d ago", "3mo ago"
 */
export function relativeTime(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}yr ago`;
  if (months > 0) return `${months}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Fetches public repos for a GitHub user, sorted by most recently updated.
 * Results are cached in-memory for CACHE_TTL_MS ms.
 *
 * @param {string} username - GitHub username (e.g. "tshoultrim")
 * @returns {Promise<Array>} Normalised repo objects
 */
export async function fetchUserRepos(username) {
  const cacheKey = username.toLowerCase();
  const cached = repoCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.repos;
  }

  const raw = [];
  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&direction=desc&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const pageRepos = await res.json();
    if (!Array.isArray(pageRepos)) throw new Error("GitHub returned an unexpected repository list.");
    raw.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }

  const repos = raw
    .filter((r) => !r.fork) // exclude forks by default
    .map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || null,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      updatedAgo: relativeTime(r.updated_at),
      topics: r.topics ?? [],
      isPrivate: r.private,
      defaultBranch: r.default_branch,
    }));

  repoCache.set(cacheKey, { repos, fetchedAt: Date.now() });

  return repos;
}

/**
 * Fetches and decodes the README.md for a specific repo.
 * Returns null if no README exists (404).
 *
 * @param {string} fullName - "owner/repo" string
 * @returns {Promise<string|null>} Decoded README text, or null
 */
export async function fetchRepoReadme(fullName) {
  const cached = readmeCache.get(fullName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const res = await fetch(
    `https://api.github.com/repos/${fullName}/readme`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  if (res.status === 404) {
    readmeCache.set(fullName, { content: null, fetchedAt: Date.now() });
    return null;
  }
  if (!res.ok) throw new Error(`README fetch failed: ${res.status}`);

  const data = await res.json();
  const binary = atob(data.content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const decoded = new TextDecoder("utf-8").decode(bytes);
  readmeCache.set(fullName, { content: decoded, fetchedAt: Date.now() });
  return decoded;
}

/**
 * Extracts a short human-friendly summary from raw README markdown.
 * Strips headings, badges, HTML tags, and returns first meaningful paragraph.
 *
 * @param {string} markdown
 * @param {number} [maxLength=200]
 * @returns {string}
 */
export function extractReadmeSummary(markdown, maxLength = 200) {
  if (!markdown) return "";

  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    // Remove headings
    .filter((l) => !l.startsWith("#"))
    // Remove badge lines (shields.io / img.shields.io)
    .filter((l) => !l.includes("shields.io") && !l.includes("badge"))
    // Remove HTML tags
    .map((l) => l.replace(/<[^>]+>/g, ""))
    // Remove markdown image syntax
    .map((l) => l.replace(/!\[.*?\]\(.*?\)/g, ""))
    // Remove markdown link wrappers but keep label text
    .map((l) => l.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"))
    // Remove empty lines created above
    .filter(Boolean);

  const paragraph = lines.join(" ");
  if (paragraph.length <= maxLength) return paragraph;
  return paragraph.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}
