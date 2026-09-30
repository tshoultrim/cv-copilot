const isGitHubPagesBuild = import.meta.env.MODE === "github-pages";

export function publicAssetUrl(path) {
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}

export function resumePdfUrl() {
  return isGitHubPagesBuild
    ? publicAssetUrl("/resume.pdf")
    : "/api/resume/download-pdf";
}

export function isStaticDeployment() {
  return isGitHubPagesBuild;
}
