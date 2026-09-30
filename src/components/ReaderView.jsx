// ReaderView.jsx — linear resume layout (Reader mode)
// Reads live resume data from useResumeData() hook.
// Top padding accounts for the new NavBar (h-12 = 48px → pt-20 ensures clearance).

import { useResumeData } from "../hooks/useResumeData";
import { resumePdfUrl } from "../utils/deployment";

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="font-display mb-3 text-lg font-semibold text-synapse">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ReaderView() {
  const {
    PROFILE,
    EXPERIENCE,
    PROJECTS,
    SKILLS,
    EDUCATION,
    CERTIFICATIONS,
  } = useResumeData();

  return (
    <div 
      className="scroll-thin w-full bg-void px-6 pb-24 pt-20 sm:px-10"
      style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", height: "calc(100dvh - 60px)" }}
    >
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs text-mist">Reader mode — linear resume</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-white">
          {PROFILE.name}
        </h1>
        <p className="mt-1 text-sm text-mist">
          {PROFILE.location} · {PROFILE.tagline}
        </p>

        <Section title="Profile">
          <p className="text-[15px] leading-relaxed text-white/85">
            {PROFILE.pitch}
          </p>
          <ul className="mt-3 space-y-1.5">
            {PROFILE.highlights.map((h) => (
              <li key={h} className="flex gap-2 text-[14px] text-white/75">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-synapse" />
                {h}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Experience">
          <div className="space-y-5">
            {EXPERIENCE.map((job) => (
              <div key={`${job.org}-${job.dates}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <p className="font-medium text-white">{job.role}</p>
                  <p className="font-mono text-xs text-pulse">{job.dates}</p>
                </div>
                <p className="text-sm text-mist">{job.org}</p>
                <ul className="mt-1.5 space-y-1">
                  {job.points.map((pt) => (
                    <li key={pt} className="flex gap-2 text-[14px] text-white/75">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pulse" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Projects">
          <div className="space-y-4">
            {PROJECTS.map((proj) => (
              <div key={proj.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <p className="font-medium text-white">{proj.name}</p>
                  <span className="font-mono text-xs text-signal">
                    {proj.status}
                  </span>
                </div>
                <p className="text-[14px] text-white/75">{proj.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <span
                key={s.name}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[13px] text-white/80"
              >
                {s.name}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Education &amp; Certifications">
          {EDUCATION.map((ed) => (
            <div key={ed.school} className="mb-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="font-medium text-white">{ed.program}</p>
                <p className="font-mono text-xs text-pulse">{ed.dates}</p>
              </div>
              <p className="text-sm text-mist">{ed.school}</p>
            </div>
          ))}
          <ul className="mt-3 space-y-1">
            {CERTIFICATIONS.map((cert) => (
              <li key={cert} className="flex gap-2 text-[14px] text-white/75">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                {cert}
              </li>
            ))}
          </ul>
        </Section>

        <a
          href={resumePdfUrl()}
          download
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-pulse/40 bg-pulse/10 px-4 py-2 font-mono text-xs text-pulse hover:bg-pulse/20"
        >
          Download PDF Resume
        </a>
      </div>
    </div>
  );
}
