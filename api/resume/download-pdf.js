import React from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Page,
  Image,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import * as staticData from "../../src/data/resumeData.js";

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Helvetica", color: "#172033", fontSize: 10, lineHeight: 1.45 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 14, objectFit: "cover" },
  identity: { flexGrow: 1 },
  name: { fontSize: 24, color: "#0e7490", marginBottom: 4 },
  contact: { fontSize: 9, color: "#475569", marginBottom: 14 },
  heading: { fontSize: 12, color: "#0e7490", marginTop: 13, marginBottom: 5, textTransform: "uppercase" },
  item: { marginBottom: 7 },
  title: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  muted: { color: "#64748b", fontSize: 9 },
  bullet: { marginLeft: 10, marginTop: 2 },
});

function sectionHeading(label) {
  return React.createElement(Text, { style: styles.heading }, label);
}

function buildResumeDocument(data) {
  const { PROFILE, EXPERIENCE = [], PROJECTS = [], SKILLS = [], EDUCATION = [], CERTIFICATIONS = [] } = data;
  return React.createElement(
    Document,
    { title: `${PROFILE.name} - Resume`, author: PROFILE.name },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        PROFILE.avatar ? React.createElement(Image, { style: styles.avatar, src: PROFILE.avatar }) : null,
        React.createElement(
          View,
          { style: styles.identity },
          React.createElement(Text, { style: styles.name }, PROFILE.name),
          React.createElement(Text, { style: styles.contact }, `${PROFILE.location}  |  ${PROFILE.tagline}`)
        )
      ),
      React.createElement(Text, null, PROFILE.pitch),
      sectionHeading("Experience"),
      ...EXPERIENCE.map((item, index) =>
        React.createElement(
          View,
          { key: `experience-${index}`, style: styles.item },
          React.createElement(Text, { style: styles.title }, `${item.role} — ${item.org}`),
          React.createElement(Text, { style: styles.muted }, item.dates),
          ...(item.points || []).map((point, pointIndex) =>
            React.createElement(Text, { key: `point-${pointIndex}`, style: styles.bullet }, `• ${point}`)
          )
        )
      ),
      sectionHeading("Projects"),
      ...PROJECTS.map((item, index) =>
        React.createElement(
          View,
          { key: `project-${index}`, style: styles.item },
          React.createElement(Text, { style: styles.title }, item.name),
          React.createElement(Text, null, item.description || "")
        )
      ),
      sectionHeading("Skills"),
      React.createElement(Text, null, SKILLS.map((skill) => skill.name).join("  ·  ")),
      sectionHeading("Education"),
      ...EDUCATION.map((item, index) =>
        React.createElement(
          View,
          { key: `education-${index}`, style: styles.item },
          React.createElement(Text, { style: styles.title }, item.program),
          React.createElement(Text, { style: styles.muted }, `${item.school}  |  ${item.dates}`)
        )
      ),
      sectionHeading("Certifications"),
      ...CERTIFICATIONS.map((item, index) =>
        React.createElement(Text, { key: `certification-${index}`, style: styles.bullet }, `• ${item}`)
      )
    )
  );
}

async function embedAvatar(avatar, req) {
  if (!avatar || avatar.startsWith("data:")) return avatar;
  if (!avatar.startsWith("/")) return avatar;

  const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
  if (host) {
    const protocol = req.headers?.["x-forwarded-proto"] || "http";
    const response = await fetch(new URL(avatar, `${protocol}://${host}`), { cache: "no-store" });
    if (response.ok) {
      const mime = response.headers.get("content-type") || "image/png";
      const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
      return `data:${mime};base64,${base64}`;
    }
  }

  const publicDir = path.resolve(process.cwd(), "public");
  const imagePath = path.resolve(publicDir, avatar.slice(1));
  if (!imagePath.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error("Profile avatar path must point to a file in the public directory.");
  }
  const image = await readFile(imagePath);
  const extension = path.extname(imagePath).toLowerCase();
  const mime = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : extension === ".webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${image.toString("base64")}`;
}

async function getResumeData(req) {
  const gistId = process.env.GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;
  const gistUrl = process.env.VITE_RESUME_GIST_URL;

  if (gistId && githubToken) {
    const response = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "portfolio-resume-pdf",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Resume Gist fetch failed (HTTP ${response.status})`);
    const gist = await response.json();
    const content = gist.files?.["resume.json"]?.content;
    if (!content) throw new Error("The configured resume Gist is missing resume.json.");
    const data = JSON.parse(content);
    const merged = {
      ...staticData,
      ...data,
      PROFILE: { ...staticData.PROFILE, ...data.PROFILE, avatar: data.PROFILE?.avatar || staticData.PROFILE.avatar },
      NODES: staticData.NODES,
    };
    merged.PROFILE.avatar = await embedAvatar(merged.PROFILE.avatar, req);
    return merged;
  }

  if (gistUrl) {
    const response = await fetch(gistUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Resume data fetch failed (HTTP ${response.status})`);
    const data = await response.json();
    const merged = {
      ...staticData,
      ...data,
      PROFILE: { ...staticData.PROFILE, ...data.PROFILE, avatar: data.PROFILE?.avatar || staticData.PROFILE.avatar },
      NODES: staticData.NODES,
    };
    merged.PROFILE.avatar = await embedAvatar(merged.PROFILE.avatar, req);
    return merged;
  }

  return {
    ...staticData,
    PROFILE: {
      ...staticData.PROFILE,
      avatar: await embedAvatar(staticData.PROFILE.avatar, req),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = await getResumeData(req);
    const pdf = await renderToBuffer(buildResumeDocument(data));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="tshoultrim-dorji-resume.pdf"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(pdf);
  } catch (err) {
    console.error("[resume/download-pdf] PDF generation failed:", err);
    return res.status(500).json({ error: "Could not generate the resume PDF." });
  }
}
