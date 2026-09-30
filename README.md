# CV Copilot — Tshoultrim Dorji

An interactive 3D portfolio and AI-powered resume assistant.

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=threedotjs)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq SDK](https://img.shields.io/badge/Groq-SDK-F55036)](https://console.groq.com/docs/overview)
[![GitHub Repository](https://img.shields.io/badge/Repository-GitHub-181717?logo=github)](https://github.com/tshoultrim/cv-copilot)

**Repository:** [github.com/tshoultrim/cv-copilot](https://github.com/tshoultrim/cv-copilot)

## Features

- Responsive React Three Fiber orbital canvas with interactive resume nodes.
- Grounded AI assistant and conversational job-match analysis.
- Single-owner email OTP access for `tshoultrim@gmail.com`.
- Owner resume and photo updates synchronized to the live portfolio and generated PDF.
- Live GitHub repository cards with README summaries, language, stars, and update times.
- Reader mode and responsive dashboard for recruiter-friendly browsing.

## Quickstart

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the values before using server-side
features. In local development without Resend, the owner OTP is printed in the
Vite server terminal.

```env
GROQ_API_KEY=your_groq_api_key
GITHUB_TOKEN=your_github_token
OWNER_EMAIL=tshoultrim@gmail.com
GIST_ID=your_resume_gist_id
ADMIN_SESSION_SECRET=your_random_32_character_or_longer_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=verified-sender@example.com
```

`GITHUB_TOKEN`, `GIST_ID`, and `ADMIN_SESSION_SECRET` are server-side secrets;
do not prefix them with `VITE_` or commit `.env.local`. Configure production
values in **Vercel → Project Settings → Environment Variables**. Verify the
sender address with Resend before enabling production OTP email.

Build the production frontend:

```bash
npm run build
```

## System Overview

React renders the page and its accessible controls; React Three Fiber renders
the orbital WebGL scene from the same resume data. Node.js `/api/*` handlers
provide AI, OTP authentication, resume persistence, and PDF generation. Vercel
runs these handlers as serverless functions. Public GitHub repository data is
fetched from GitHub's REST API.

The immersive 3D presentation creates a distinctive way to explore a resume,
but uses more GPU and battery than a conventional page. Reader mode and semantic
HTML provide a simpler alternative.
