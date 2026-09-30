# CV Copilot — Tshoultrim Dorji

An interactive 3D developer portfolio and AI-powered resume assistant, built
with React, Three.js, and React Three Fiber.

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=threedotjs)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq SDK](https://img.shields.io/badge/Groq-SDK-F55036)](https://console.groq.com/docs/overview)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

**Repository:** [github.com/tshoultrim/cv-copilot](https://github.com/tshoultrim/cv-copilot)

## Features

- Responsive 3D orbital resume canvas and accessible Reader mode.
- Resume-grounded AI assistant and conversational job matching.
- Owner-only OTP sign-in for `tshoultrim@gmail.com`.
- Resume and avatar edits synchronized with the live portfolio and generated PDF.
- Automatically synced public GitHub repositories, README summaries, languages,
  stars, and update times.
- Cyberpunk glass UI with responsive dashboard and mobile navigation.

## Local Development

Requires Node.js 20+ and npm:

```bash
npm install
cp .env.example .env.local
npm run dev
```

For PowerShell, use `Copy-Item .env.example .env.local`. Add the server-side
values needed for the features you use:

```env
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token
GIST_ID=your_resume_gist_id
OWNER_EMAIL=tshoultrim@gmail.com
ADMIN_SESSION_SECRET=your_random_secret_at_least_32_characters
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=verified-sender@example.com
```

Never commit `.env.local` or expose server credentials through `VITE_` variables.
`GROQ_API_KEY` enables AI, `GITHUB_TOKEN` and `GIST_ID` enable saved resume and
avatar edits, and Resend credentials enable production OTP email. In local
development without Resend, the OTP is printed in the Vite server terminal.

Build the default (Vercel-root) frontend with `npm run build`.

## Deployment

This project supports two deployment targets with different capabilities:

### GitHub Pages — static portfolio

The GitHub Actions workflow in `.github/workflows/deploy.yml` builds and
publishes the static site at
<https://tshoultrim.github.io/cv-copilot/>.

1. In the repository, open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or run **Actions → Deploy static site to GitHub Pages → Run
   workflow**. The workflow installs dependencies, builds with the
   `/cv-copilot/` base path, and deploys `dist/`.

GitHub Pages hosts static files only; it does not run this project's Node
`/api/*` functions. The AI chat interface is available on Pages and can call a
separately deployed Vercel API: add a GitHub repository **Actions variable**
named `VITE_API_BASE_URL` with the Vercel origin (for example,
`https://your-project.vercel.app`, without a trailing slash), then rerun the
Pages workflow. The chat API enables CORS for this cross-origin request. Without
that variable, the chat remains visible and displays a configuration message
when used.

The Pages build uses the bundled resume and static `public/resume.pdf`. Owner
OTP, saved editing, live server resume polling, and dynamic PDF generation
require the Vercel deployment described below. Public GitHub repository sync
continues to use GitHub's public REST API.

### Vercel — full application and serverless API

Import `tshoultrim/cv-copilot` into Vercel and deploy with the default Vite
settings (`npm run build`, output `dist`). Add the required server environment
variables under **Project → Settings → Environment Variables**:

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | AI chat and job matching |
| `OWNER_EMAIL` | Must be `tshoultrim@gmail.com` |
| `ADMIN_SESSION_SECRET` | Production owner-session signing secret (32+ characters) |
| `GITHUB_TOKEN` | Server-side access for resume Gist persistence |
| `GIST_ID` | Gist containing `resume.json` |
| `RESEND_API_KEY` | Production OTP delivery |
| `RESEND_FROM_EMAIL` | Verified Resend sender address |
| `VITE_RESUME_GIST_URL` | Optional public resume Gist read fallback |

After deployment, test `/api/chat`, owner OTP, resume editing, and the PDF
download. To connect the GitHub Pages AI chat to this API, copy the Vercel
deployment origin into the GitHub repository Actions variable
`VITE_API_BASE_URL` and rerun the Pages workflow. This value is a public API
origin, not a secret. Never add server secrets as `VITE_` variables.

## System Overview

React renders navigation, chat, and accessible resume content; React Three Fiber
renders the interactive WebGL scene using the same resume data. On Vercel, Node
serverless functions provide AI, OTP authentication, Gist-backed editing, and
PDF generation. GitHub Pages instead serves the static frontend and bundled
assets.

The 3D interface makes resume connections memorable and explorable, at the cost
of higher GPU and battery usage than a conventional page. Reader mode provides
a lightweight alternative.
