import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

type ExportExperience = {
  role?: string;
  company?: string;
  rewrittenBullets?: string[];
};

type ExportPayload = {
  fileName?: string;
  profile?: {
    name?: string;
    role?: string;
    location?: string;
    email?: string;
    phone?: string;
    links?: string[];
    workAuthorization?: string;
    education?: string[];
    certifications?: string[];
  };
  result?: {
    version?: {
      language?: string;
      format?: string;
      targetCountry?: string;
      tone?: string;
      designStyle?: string;
    };
    localizedHeadings?: {
      summary?: string;
      skills?: string;
      experience?: string;
      education?: string;
      projects?: string;
      certifications?: string;
      languages?: string;
    };
    professionalSummary?: string;
    skills?: {
      matched?: string[];
      recommended?: string[];
      missing?: string[];
    };
    experience?: ExportExperience[];
    projects?: string[];
  };
};

type LayoutKind = "ats" | "european" | "german" | "executive" | "compact" | "creative";

type PdfContext = {
  doc: PDFKit.PDFDocument;
  payload: ExportPayload;
  profile: NonNullable<ExportPayload["profile"]>;
  result: NonNullable<ExportPayload["result"]>;
  headings: NonNullable<ExportPayload["result"]>["localizedHeadings"];
  contact: string[];
  skills: string[];
  projects: string[];
  education: string[];
  certifications: string[];
  accent: string;
  kind: LayoutKind;
};

function sanitize(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function safeList(items?: string[]) {
  return (items || []).map(sanitize).filter(Boolean);
}

function confirmedSkills(payload: ExportPayload) {
  const missing = new Set(safeList(payload.result?.skills?.missing).map((item) => item.toLowerCase()));
  return Array.from(
    new Set(
      [...safeList(payload.result?.skills?.matched), ...safeList(payload.result?.skills?.recommended)]
        .filter((item) => !missing.has(item.toLowerCase()))
    )
  ).slice(0, 18);
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function chooseLayout(payload: ExportPayload): LayoutKind {
  const format = `${payload.result?.version?.format || ""} ${payload.result?.version?.designStyle || ""}`.toLowerCase();
  const language = `${payload.result?.version?.language || ""}`.toLowerCase();
  if (format.includes("german") || language === "german") return "german";
  if (format.includes("european")) return "european";
  if (format.includes("executive")) return "executive";
  if (format.includes("compact") || format.includes("one-page")) return "compact";
  if (format.includes("creative")) return "creative";
  return "ats";
}

function accentFor(kind: LayoutKind) {
  return {
    ats: "#1f4ed8",
    european: "#0f8f62",
    german: "#111827",
    executive: "#111827",
    compact: "#ea580c",
    creative: "#c026d3"
  }[kind];
}

function title(doc: PDFKit.PDFDocument, text: string, accent: string) {
  doc.moveDown(0.75);
  doc.font("Helvetica-Bold").fontSize(8.8).fillColor(accent).text(text.toUpperCase(), { characterSpacing: 0.7 });
  doc.moveTo(doc.x, doc.y + 2).lineTo(552, doc.y + 2).strokeColor("#d7dee8").lineWidth(0.7).stroke();
  doc.moveDown(0.5);
}

function bullet(doc: PDFKit.PDFDocument, text: string, size = 9.2) {
  doc.font("Helvetica").fontSize(size).fillColor("#253044").text(`• ${text}`, { indent: 8, lineGap: 1.8 });
  doc.moveDown(0.14);
}

function writeExperience(ctx: PdfContext, size = 9.2) {
  const { doc, result } = ctx;
  for (const item of result.experience || []) {
    const itemTitle = [item.role, item.company].map(sanitize).filter(Boolean).join(" | ") || "Experience";
    doc.moveDown(0.2).font("Helvetica-Bold").fontSize(size + 0.7).fillColor("#111827").text(itemTitle);
    for (const itemBullet of safeList(item.rewrittenBullets).slice(0, ctx.kind === "compact" ? 5 : 7)) {
      bullet(doc, itemBullet, size);
    }
  }
}

function writeSimpleSections(ctx: PdfContext, size = 9.2) {
  const { doc, headings, skills, projects, education, certifications, accent } = ctx;
  if (skills.length) {
    title(doc, headings?.skills || "Skills", accent);
    doc.font("Helvetica").fontSize(size).fillColor("#253044").text(skills.join(" | "), { lineGap: 1.7 });
  }
  if (projects.length) {
    title(doc, headings?.projects || "Projects", accent);
    projects.slice(0, ctx.kind === "compact" ? 3 : 4).forEach((item) => bullet(doc, item, size));
  }
  if (education.length) {
    title(doc, headings?.education || "Education", accent);
    education.slice(0, 4).forEach((item) => bullet(doc, item, size));
  }
  if (certifications.length) {
    title(doc, headings?.certifications || "Certifications", accent);
    certifications.slice(0, 4).forEach((item) => bullet(doc, item, size));
  }
}

function renderAts(ctx: PdfContext) {
  const { doc, profile, result, headings, contact, accent } = ctx;
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#111827").text(sanitize(profile.name) || "Candidate Name");
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(accent).text(sanitize(profile.role) || "Professional");
  if (contact.length) doc.moveDown(0.25).font("Helvetica").fontSize(8.8).fillColor("#4b5563").text(contact.join(" | "));
  if (profile.workAuthorization) doc.moveDown(0.3).font("Helvetica-Bold").fontSize(8.8).fillColor("#253044").text(sanitize(profile.workAuthorization));
  doc.moveDown(0.7).moveTo(42, doc.y).lineTo(552, doc.y).strokeColor("#111827").lineWidth(1.1).stroke();
  title(doc, headings?.summary || "Professional Summary", accent);
  doc.font("Helvetica").fontSize(9.5).fillColor("#253044").text(sanitize(result.professionalSummary), { lineGap: 2 });
  title(doc, headings?.experience || "Work Experience", accent);
  writeExperience(ctx);
  writeSimpleSections(ctx);
}

function renderEuropean(ctx: PdfContext) {
  const { doc, profile, result, headings, contact, accent } = ctx;
  doc.rect(42, 42, 510, 8).fill(accent);
  doc.moveDown(1.25);
  doc.font("Helvetica-Bold").fontSize(21).fillColor("#111827").text(sanitize(profile.name) || "Candidate Name");
  doc.font("Helvetica").fontSize(9).fillColor("#4b5563").text([sanitize(profile.role), ...contact].filter(Boolean).join(" | "), { lineGap: 1.4 });
  if (profile.workAuthorization) doc.moveDown(0.25).font("Helvetica-Bold").fontSize(8.6).fillColor("#253044").text(sanitize(profile.workAuthorization));
  title(doc, headings?.summary || "Profile", accent);
  doc.font("Helvetica").fontSize(9.4).fillColor("#253044").text(sanitize(result.professionalSummary), { lineGap: 2 });
  title(doc, headings?.experience || "Professional Experience", accent);
  writeExperience(ctx, 9.1);
  writeSimpleSections(ctx, 9.1);
}

function renderExecutive(ctx: PdfContext) {
  const { doc, profile, result, headings, contact, accent, skills } = ctx;
  doc.rect(0, 0, 595, 128).fill("#111827");
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#ffffff").text(sanitize(profile.name) || "Candidate Name", 42, 38);
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#c7d2fe").text(sanitize(profile.role) || "Professional");
  if (contact.length) doc.moveDown(0.35).font("Helvetica").fontSize(8.6).fillColor("#e5e7eb").text(contact.join(" | "));
  doc.y = 150;
  if (skills.length) {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(accent).text("EXECUTIVE STRENGTHS");
    doc.moveDown(0.35).font("Helvetica").fontSize(8.8).fillColor("#253044").text(skills.slice(0, 10).join(" | "), { lineGap: 1.6 });
  }
  title(doc, headings?.summary || "Executive Profile", accent);
  doc.font("Helvetica").fontSize(9.5).fillColor("#253044").text(sanitize(result.professionalSummary), { lineGap: 2 });
  title(doc, headings?.experience || "Leadership Experience", accent);
  writeExperience(ctx, 9.2);
  writeSimpleSections({ ...ctx, skills: [] }, 9.1);
}

function renderCompact(ctx: PdfContext) {
  const { doc, profile, result, headings, contact, accent } = ctx;
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111827").text(sanitize(profile.name) || "Candidate Name");
  doc.font("Helvetica").fontSize(8.2).fillColor("#4b5563").text([sanitize(profile.role), ...contact].filter(Boolean).join(" | "));
  doc.moveDown(0.45).moveTo(42, doc.y).lineTo(552, doc.y).strokeColor(accent).lineWidth(0.9).stroke();
  title(doc, headings?.summary || "Summary", accent);
  doc.font("Helvetica").fontSize(8.8).fillColor("#253044").text(sanitize(result.professionalSummary), { lineGap: 1.5 });
  title(doc, headings?.experience || "Experience", accent);
  writeExperience(ctx, 8.7);
  writeSimpleSections(ctx, 8.6);
}

function renderCreative(ctx: PdfContext) {
  const { doc, profile, result, headings, contact, accent } = ctx;
  doc.rect(42, 42, 8, 720).fill(accent);
  doc.font("Helvetica-Bold").fontSize(23).fillColor("#111827").text(sanitize(profile.name) || "Candidate Name", 68, 52);
  doc.font("Helvetica-Bold").fontSize(10.3).fillColor(accent).text(sanitize(profile.role) || "Professional");
  if (contact.length) doc.moveDown(0.28).font("Helvetica").fontSize(8.6).fillColor("#4b5563").text(contact.join(" | "));
  title(doc, headings?.summary || "Professional Summary", accent);
  doc.font("Helvetica").fontSize(9.4).fillColor("#253044").text(sanitize(result.professionalSummary), { lineGap: 2 });
  title(doc, headings?.experience || "Experience", accent);
  writeExperience(ctx, 9.1);
  writeSimpleSections(ctx, 9);
}

function renderPdf(ctx: PdfContext) {
  if (ctx.kind === "european" || ctx.kind === "german") return renderEuropean(ctx);
  if (ctx.kind === "executive") return renderExecutive(ctx);
  if (ctx.kind === "compact") return renderCompact(ctx);
  if (ctx.kind === "creative") return renderCreative(ctx);
  return renderAts(ctx);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ExportPayload;
  const profile = payload.profile || {};
  const result = payload.result || {};
  const kind = chooseLayout(payload);
  const doc = new PDFDocument({
    size: "A4",
    margin: kind === "compact" ? 34 : 42,
    info: {
      Title: payload.fileName || "careerforge-resume",
      Author: sanitize(profile.name) || "CareerForge"
    }
  });
  const pdfPromise = collectPdf(doc);

  renderPdf({
    doc,
    payload,
    profile,
    result,
    headings: result.localizedHeadings || {},
    contact: [profile.location, profile.email, profile.phone, ...(profile.links || [])].map(sanitize).filter(Boolean),
    skills: confirmedSkills(payload),
    projects: safeList(result.projects),
    education: safeList(profile.education),
    certifications: safeList(profile.certifications),
    accent: accentFor(kind),
    kind
  });

  doc.end();
  const pdf = await pdfPromise;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitize(payload.fileName || "careerforge-resume.pdf")}"`
    }
  });
}
