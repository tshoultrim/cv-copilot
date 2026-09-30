// Single source of truth for every section of the portfolio.
// Edit this file — OR update the GitHub Gist at VITE_RESUME_GIST_URL —
// to propagate changes everywhere without a redeploy.
//
// NOTE: NODES contains Math.PI and is always read from this bundled file.
// All other exports are overridden by the live Gist data once fetched.

export const PROFILE = {
  name: "Tshoultrim Dorji",
  location: "Thimphu, Bhutan",
  avatar: "/profile-avatar.png",
  tagline: "BCA – Data Science student, Chandigarh University (5th Semester)",
  pitch:
    "Seeking a 6th-semester internship in Data Science / AI. I bring a working foundation in web development and network administration, built through real jobs and national service, into a growing focus on Python, machine learning and data visualization.",
  highlights: [
    "De-suung Zhabtog pin, awarded by His Majesty The King for national service",
    "Certificate from HRH Prince Jigyel Ugyen Wangchuck — Tour of the Dragon volunteer",
    "6th Coronation Marathon, certificate of participation — Jakar, Bumthang",
  ],
  resumeFile: "/resume.pdf",
};

export const NODES = [
  {
    id: "profile",
    label: "Tshoultrim Dorji",
    color: "#FFC857",
    position: [0, 0, 0],
    summary: "Who I am, and what I'm looking for.",
    orbitRadius: 0,
    orbitSpeed: 0,
    nodeScale: 1.0,
    isSun: true,
  },
  {
    id: "experience",
    label: "Experience",
    color: "#00FF87",
    position: [2.2, 0, 0],
    summary: "GreenCyberTech & De-suung Headquarter.",
    orbitRadius: 2.2,
    orbitSpeed: 0.3,
    orbitOffset: 0,
    nodeScale: 0.55,
  },
  {
    id: "projects",
    label: "Projects",
    color: "#7C5CFF",
    position: [3.5, 0, 0],
    summary: "Power BI dashboard & an in-progress agentic HR system.",
    orbitRadius: 3.5,
    orbitSpeed: 0.22,
    orbitOffset: -0.5,
    nodeScale: 0.45,
  },
  {
    id: "skills",
    label: "Data Science Core",
    color: "#00D2FF",
    position: [4.8, 0, 0],
    summary: "Data science, web development, and networking.",
    orbitRadius: 4.8,
    orbitSpeed: 0.16,
    orbitOffset: -1.0,
    nodeScale: 0.5,
  },
  {
    id: "education",
    label: "Education & Certs",
    color: "#FF5C7A",
    position: [6.2, 0, 0],
    summary: "Chandigarh University, and eight certifications.",
    orbitRadius: 6.2,
    orbitSpeed: 0.11,
    orbitOffset: -1.5,
    nodeScale: 0.4,
  },
];

export const EXPERIENCE = [
  {
    role: "Web Developer & IT Support (Employee)",
    org: "GreenCyberTech",
    dates: "Apr 2024 – Oct 2024",
    points: [
      "Continued at GreenCyberTech as a full-time employee after the internship, taking on greater ownership of web development and IT support work.",
      "Supported website development and maintenance, and handled day-to-day IT troubleshooting.",
    ],
  },
  {
    role: "Web Developer & IT Support (Internship)",
    org: "GreenCyberTech",
    dates: "Jan 2024 – Mar 2024",
    points: [
      "Completed a certified 3-month internship, gaining hands-on exposure to real-world web development and IT support projects.",
    ],
  },
  {
    role: "Web Developer & Network Support",
    org: "De-suung Headquarter",
    dates: "Aug 2022 – 2023",
    points: [
      "Developed and maintained web pages, contributing to the organization's digital presence.",
      "Provided network support, including configuration and troubleshooting of network systems.",
      "Assisted colleagues and staff with day-to-day IT and connectivity issues.",
      "Applied foundational programming and database knowledge to support internal projects.",
    ],
  },
];

export const PROJECTS = [
  {
    name: "Power BI Dashboard — University Project",
    status: "Completed",
    description:
      "Built a Power BI dashboard as part of a university project, analyzing and visualizing data to support data-driven decision-making.",
  },
  {
    name: "Agentic HR System",
    status: "In Progress",
    description:
      "Building a full agentic OS-based HR system, while deepening skills in Data Science, Machine Learning and AI.",
  },
];

// level: self-assessed proficiency 0–100 (shown in SkillsChart)
export const SKILLS = [
  { name: "Python",                    group: "Data Science", level: 70 },
  { name: "Machine Learning",          group: "Data Science", level: 60 },
  { name: "AI Tools",                  group: "Data Science", level: 75 },
  { name: "Data Science Fundamentals", group: "Data Science", level: 68 },
  { name: "Power BI",                  group: "Visualization", level: 72 },
  { name: "HTML",                      group: "Web",          level: 85 },
  { name: "CSS",                       group: "Web",          level: 80 },
  { name: "JavaScript",               group: "Web",          level: 78 },
  { name: "Database Design",           group: "Web",          level: 65 },
  { name: "Network Configuration",     group: "Networking",   level: 70 },
  { name: "Network Troubleshooting",   group: "Networking",   level: 70 },
  { name: "Cisco (CCNA)",              group: "Networking",   level: 68 },
];

export const EDUCATION = [
  {
    school: "Chandigarh University",
    program: "BCA – Data Science",
    dates: "2023 – 2027 (5th Semester)",
  },
  {
    school: "Jakar Higher Secondary School",
    program: "Higher Secondary School (Class XII)",
    dates: "Feb 2019 – Dec 2019",
  },
];

export const CERTIFICATIONS = [
  "Internship Certificate — GreenCyberTech (3-Month Internship, Jan–Mar 2024)",
  "ICT: Foundation — Gyalpozhing College of Information Technology",
  "Introduction to Coding — DSP Training Centre, Yonphula",
  "Python Programming and Database Fundamentals — BETA Park, Thimphu",
  "Cisco Certified Network Associate (CCNA) — Royal Institute of Management, Thimphu",
  "Participation Certificate, SAP Hackathon — Chandigarh University, Punjab, India",
  "Generative AI Mastermind — Outskill, India",
  "AI Tools Online Workshop — be10x, India",
];
