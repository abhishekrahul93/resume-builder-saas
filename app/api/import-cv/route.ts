import { NextResponse } from "next/server";
import mammoth from "mammoth";

type ImportedResume = {
  name: string;
  role: string;
  email: string;
  phone: string;
  links: string;
  summary: string;
  experience: string;
  skills: string;
  rawText: string;
};

function cleanLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function findEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function findPhone(text: string) {
  return text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || "";
}

function findLinks(text: string) {
  return Array.from(text.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|behance\.net|portfolio\.)[^\s,;)]*/gi))
    .map((match) => match[0])
    .slice(0, 4)
    .join(" | ");
}

function sectionBetween(lines: string[], starts: string[], stops: string[]) {
  const startIndex = lines.findIndex((line) => starts.some((start) => line.toLowerCase().includes(start)));
  if (startIndex === -1) {
    return "";
  }

  const rest = lines.slice(startIndex + 1);
  const stopIndex = rest.findIndex((line) => stops.some((stop) => line.toLowerCase().includes(stop)));
  return (stopIndex === -1 ? rest : rest.slice(0, stopIndex)).join("\n");
}

function compactForBullets(text: string) {
  return cleanLines(text)
    .filter((line) => line.length > 12)
    .slice(0, 8)
    .join("\n");
}

function parseResumeText(text: string): ImportedResume {
  const lines = cleanLines(text);
  const lowerStops = ["experience", "employment", "education", "skills", "projects", "certifications", "summary", "profile"];
  const email = findEmail(text);
  const phone = findPhone(text);
  const links = findLinks(text);
  const name = lines.find((line) => !line.includes("@") && !/\d{4,}/.test(line) && line.length <= 60) || "";
  const role =
    lines
      .slice(1, 8)
      .find((line) => /analyst|developer|engineer|manager|designer|consultant|specialist|associate|intern/i.test(line)) || "";

  const summary = sectionBetween(lines, ["summary", "profile", "objective"], lowerStops) || lines.slice(1, 5).join(" ");
  const experience =
    sectionBetween(lines, ["experience", "employment", "work history"], ["education", "skills", "projects", "certifications"]) ||
    lines.slice(5, 16).join("\n");
  const skills = sectionBetween(lines, ["skills", "technical skills", "core skills"], ["experience", "education", "projects", "certifications"]);

  return {
    name,
    role,
    email,
    phone,
    links,
    summary: summary.replace(/\s+/g, " ").trim(),
    experience: compactForBullets(experience),
    skills: cleanLines(skills).join(", "),
    rawText: text
  };
}

async function extractText(file: File) {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".pdf")) {
    throw new Error("PDF upload is coming next. Please upload a DOCX or TXT version for now.");
  }

  throw new Error("Unsupported file type. Please upload a DOCX or TXT file.");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No CV file was uploaded." }, { status: 400 });
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Please upload a file smaller than 4 MB." }, { status: 400 });
  }

  try {
    const text = await extractText(file);
    return NextResponse.json(parseResumeText(text));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read this CV." }, { status: 400 });
  }
}
