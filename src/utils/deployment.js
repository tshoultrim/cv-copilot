const isGitHubPagesBuild = import.meta.env.MODE === "github-pages";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

export function publicAssetUrl(path) {
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

export function resumePdfUrl() {
  return isGitHubPagesBuild
    ? publicAssetUrl("/resume.pdf")
    : "/api/resume/download-pdf";
}

export function apiUrl(path) {
  if (isGitHubPagesBuild) {
    if (!apiBaseUrl) {
      throw new Error("AI service is not configured for GitHub Pages. Set the VITE_API_BASE_URL repository variable to your Vercel deployment URL.");
    }
    return `${apiBaseUrl}/api/${path.replace(/^\/+/, "")}`;
  }
  return `/api/${path.replace(/^\/+/, "")}`;
}

export function isStaticDeployment() {
  return isGitHubPagesBuild;
}
