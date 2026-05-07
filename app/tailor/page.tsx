"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { appliedResumeStorageKey, savedVersionsStorageKey, type ResumeState } from "@/lib/resume";

type CvVersion = {
  language: string;
  format: string;
  targetCountry: string;
  tone: string;
};

type TailoredExperience = {
  role: string;
  company: string;
  rewrittenBullets: string[];
};

type TailorResult = {
  version: CvVersion;
  localizedHeadings: {
    summary: string;
    skills: string;
    experience: string;
    education: string;
    projects: string;
    certifications: string;
    languages: string;
  };
  atsScore: number;
  marketFitScore: number;
  professionalSummary: string;
  skills: {
    matched: string[];
    missing: string[];
    recommended: string[];
  };
  experience: TailoredExperience[];
  projects: string[];
  educationSuggestions: string[];
  certificationSuggestions: string[];
  languageSuggestions: string[];
  countrySpecificTips: string[];
  coverLetter: string;
  improvementTips: string[];
  agentSuggestions: string[];
};

type SavedCvVersion = {
  id: string;
  name: string;
  createdAt: string;
  version: CvVersion;
  result: TailorResult;
  draft: Partial<ResumeState>;
};

type AgentMessage = {
  role: "user" | "assistant";
  content: string;
  applyText?: string;
};

type UploadedCv = {
  name: string;
  size: number;
  text: string;
};

type CandidateProfile = {
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  links: string[];
  workAuthorization: string;
  education: string[];
  certifications: string[];
};

const languages = ["English", "German", "French", "Spanish", "Italian", "Dutch", "Arabic", "Hindi"];
const formats = ["Global ATS Resume", "European CV", "German Lebenslauf", "UK CV", "US Resume", "Executive CV", "Creative CV", "Entry-Level CV"];
const tones = ["Professional", "Modern", "Executive", "Friendly", "Concise"];
const countries = ["Germany", "Austria", "Switzerland", "United Kingdom", "United States", "Canada", "UAE", "India", "Netherlands", "France", "Spain", "Italy"];
const enhancerModes = ["ATS-friendly", "More concise", "More executive", "Stronger bullets", "Keyword optimized"];
const quickActions = [
  "Improve Summary",
  "Rewrite Experience",
  "Translate to German",
  "Make European CV",
  "Boost ATS Score",
  "Generate Cover Letter",
  "Suggest Keywords",
  "Make Executive Version",
  "Shorten to 1 Page",
  "Improve for Germany"
];

const defaultVersion: CvVersion = {
  language: "English",
  format: "Global ATS Resume",
  targetCountry: "United States",
  tone: "Professional"
};

function joinList(items: string[]) {
  return items.filter(Boolean).join(", ");
}

function joinBullets(items: string[]) {
  return items.filter(Boolean).join("\n");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Strong match";
  if (score >= 55) return "Needs tuning";
  return "Low match";
}

function versionName(version: CvVersion) {
  if (version.format === "German Lebenslauf" || version.language === "German") return "German Lebenslauf Version";
  if (version.format === "European CV") return "European CV Version";
  if (version.format === "Executive CV") return "Executive Version";
  if (version.format === "Entry-Level CV") return "Entry-Level Version";
  return `${version.language} ATS Version`;
}

function exportName(version: CvVersion) {
  if (version.format === "German Lebenslauf" || version.language === "German") return `lebenslauf-${slug(version.language)}-${slug(version.targetCountry)}.pdf`;
  if (version.format === "European CV") return `cv-european-${slug(version.language)}.pdf`;
  return `resume-${slug(version.language)}-${slug(version.format)}.pdf`;
}

function wordExportName(version: CvVersion) {
  return exportName(version).replace(/\.pdf$/i, ".doc");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function listHtml(items: string[]) {
  const cleanItems = items.filter(Boolean);
  if (!cleanItems.length) return "";
  return `<ul>${cleanItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isContactLine(value: string) {
  return /@|\+\d|linkedin|github|https?:|www\.|eligible|visa|work author/i.test(value);
}

function extractSectionLines(cv: string, headings: string[]) {
  const stopHeadings = /^(professional summary|summary|profil|profile|professional experience|experience|berufserfahrung|work experience|portfolio projects|projects|projekte|technical skills|skills|fähigkeiten|education|ausbildung|certifications|training|languages|sprachen)$/i;
  const lines = cv.split(/\r?\n/).map(cleanText).filter(Boolean);
  const startIndex = lines.findIndex((line) => headings.some((heading) => line.toLowerCase().startsWith(heading.toLowerCase())));
  if (startIndex === -1) return [];
  const output: string[] = [];
  const firstLine = headings.reduce((current, heading) => current.replace(new RegExp(`^${heading}\\s*`, "i"), ""), lines[startIndex]).trim();
  if (firstLine && !stopHeadings.test(firstLine)) output.push(firstLine.replace(/^[-•]\s*/, ""));
  for (const line of lines.slice(startIndex + 1)) {
    if (stopHeadings.test(line) && output.length) break;
    if (!stopHeadings.test(line)) output.push(line.replace(/^[-•]\s*/, ""));
  }
  return output.slice(0, 5);
}

function candidateFromCv(cv: string, result?: TailorResult | null): CandidateProfile {
  const lines = cv.split(/\r?\n/).map(cleanText).filter(Boolean);
  const email = cv.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = cv.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?){3,}\d{2,}/)?.[0] || "";
  const links = Array.from(new Set((cv.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s|,]+/gi) || []).map((item) => item.replace(/[.,;]+$/, ""))));
  const locationLine = cv.match(/\b[A-Z][a-zA-Z]+,\s*(?:Germany|India|United States|Canada|UAE|Netherlands|France|Spain|Italy|Austria|Switzerland|United Kingdom)\b/)?.[0] || "";
  const workAuthorization = lines.find((line) => /eligible|visa|work author/i.test(line)) || "";
  const name = lines.find((line) => !isContactLine(line) && line.length <= 42) || "Candidate Name";
  const role = lines.find((line) => line !== name && !isContactLine(line) && line.length <= 88) || result?.experience[0]?.role || "Professional";

  return {
    name,
    role,
    location: locationLine,
    email,
    phone,
    links,
    workAuthorization,
    education: extractSectionLines(cv, ["EDUCATION", "Ausbildung"]),
    certifications: extractSectionLines(cv, ["CERTIFICATIONS & TRAINING", "CERTIFICATIONS", "Training", "Zertifizierungen"])
  };
}

function tailoredCvDocumentHtml(result: TailorResult, profile: CandidateProfile) {
  const skills = result.skills.matched.length ? result.skills.matched : result.skills.recommended;
  const experience = result.experience
    .map((item) => {
      const title = [item.role, item.company].filter(Boolean).join(" | ") || "Experience";
      return `<div class="experience"><h3>${escapeHtml(title)}</h3>${listHtml(item.rewrittenBullets)}</div>`;
    })
    .join("");
  const contact = [profile.location, profile.email, profile.phone, ...profile.links].filter(Boolean);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(exportName(result.version).replace(/\.pdf$/i, ""))}</title>
  <style>
    body { color: #1f2a24; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.42; margin: 34px; }
    header { border-bottom: 2px solid #1f2a24; margin-bottom: 18px; padding-bottom: 12px; }
    h1 { font-size: 25pt; letter-spacing: .2px; margin: 0 0 4px; }
    h2 { border-bottom: 1px solid #cbd6d0; color: #145f46; font-size: 9.5pt; letter-spacing: .8px; margin: 17px 0 7px; padding-bottom: 3px; text-transform: uppercase; }
    h3 { font-size: 10.5pt; margin: 12px 0 5px; }
    p { margin: 0 0 7px; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    .role { color: #145f46; font-size: 12pt; font-weight: 700; }
    .contact { color: #46534d; font-size: 9.5pt; margin-top: 7px; }
    .auth { color: #46534d; font-size: 9.5pt; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(profile.name)}</h1>
    <p class="role">${escapeHtml(profile.role)}</p>
    ${contact.length ? `<p class="contact">${escapeHtml(contact.join(" | "))}</p>` : ""}
    ${profile.workAuthorization ? `<p class="auth">${escapeHtml(profile.workAuthorization)}</p>` : ""}
  </header>
  <section>
    <h2>${escapeHtml(result.localizedHeadings.summary)}</h2>
    <p>${escapeHtml(result.professionalSummary)}</p>
  </section>
  <section>
    <h2>${escapeHtml(result.localizedHeadings.experience)}</h2>
    ${experience}
  </section>
  <section>
    <h2>${escapeHtml(result.localizedHeadings.skills)}</h2>
    <p>${escapeHtml(joinList(skills))}</p>
  </section>
  ${result.projects.length ? `<section><h2>${escapeHtml(result.localizedHeadings.projects)}</h2>${listHtml(result.projects)}</section>` : ""}
  ${profile.education.length ? `<section><h2>${escapeHtml(result.localizedHeadings.education)}</h2>${listHtml(profile.education)}</section>` : ""}
  ${profile.certifications.length ? `<section><h2>${escapeHtml(result.localizedHeadings.certifications)}</h2>${listHtml(profile.certifications)}</section>` : ""}
</body>
</html>`;
}

function draftFromResult(result: TailorResult, jobDescription: string): Partial<ResumeState> {
  return {
    targetJob: jobDescription,
    summary: result.professionalSummary,
    skills: joinList(result.skills.recommended.length ? result.skills.recommended : result.skills.matched),
    experience: joinBullets(result.experience.flatMap((item) => item.rewrittenBullets)),
    projects: joinBullets(result.projects),
    certifications: joinBullets(result.certificationSuggestions),
    education: joinBullets(result.educationSuggestions),
    versionName: versionName(result.version),
    versionLanguage: result.version.language,
    versionFormat: result.version.format,
    exportFileName: exportName(result.version)
  };
}

export default function TailorPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [oldCv, setOldCv] = useState("");
  const [uploadedCv, setUploadedCv] = useState<UploadedCv | null>(null);
  const [showExtractedCv, setShowExtractedCv] = useState(false);
  const [version, setVersion] = useState<CvVersion>(defaultVersion);
  const [mode, setMode] = useState(enhancerModes[0]);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [savedVersions, setSavedVersions] = useState<SavedCvVersion[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      role: "assistant",
      content: "I can help improve your CV step by step. Choose a quick action or ask me what to improve first."
    }
  ]);
  const [agentInput, setAgentInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showExportPrompt, setShowExportPrompt] = useState(false);

  const allBullets = useMemo(() => result?.experience.flatMap((item) => item.rewrittenBullets) || [], [result]);
  const candidateProfile = useMemo(() => candidateFromCv(oldCv, result), [oldCv, result]);

  useEffect(() => {
    const stored = window.localStorage.getItem(savedVersionsStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as SavedCvVersion[];
      queueMicrotask(() => setSavedVersions(parsed));
    } catch {
      window.localStorage.removeItem(savedVersionsStorageKey);
    }
  }, []);

  function persistVersions(next: SavedCvVersion[]) {
    setSavedVersions(next);
    window.localStorage.setItem(savedVersionsStorageKey, JSON.stringify(next));
  }

  function updateVersion(field: keyof CvVersion, value: string) {
    setVersion((current) => {
      const next = { ...current, [field]: value };
      if (field === "language" && value === "German") {
        next.format = "German Lebenslauf";
        next.targetCountry = "Germany";
        next.tone = "Professional";
      }
      if (field === "format" && value === "German Lebenslauf") {
        next.language = "German";
        next.targetCountry = "Germany";
        next.tone = "Professional";
      }
      return next;
    });
  }

  async function importCv(file: File | undefined) {
    if (!file) return;
    setIsImporting(true);
    setError("");
    setNotice("");

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-cv", { method: "POST", body: formData, signal: controller.signal });
      window.clearTimeout(timeout);
      const imported = await response.json();

      if (!response.ok) {
        setError(imported.error || "Could not import this CV.");
        return;
      }

      const extractedText = imported.rawText || [imported.summary, imported.experience, imported.skills].filter(Boolean).join("\n\n");
      setOldCv(extractedText);
      setUploadedCv({ name: file.name, size: file.size, text: extractedText });
      setShowExtractedCv(false);
      setNotice("PDF uploaded successfully. Choose a CV version, paste the job description, then generate.");
    } catch (importError) {
      setError(importError instanceof DOMException && importError.name === "AbortError" ? "CV import took too long. Please try a smaller PDF or upload a DOCX/TXT version." : "Could not upload this CV. Please try again or use DOCX/TXT.");
    } finally {
      setIsImporting(false);
    }
  }

  function clearUploadedCv() {
    setOldCv("");
    setUploadedCv(null);
    setShowExtractedCv(false);
    setNotice("");
  }

  async function generateTailoredCv(selectedMode = mode, selectedVersion = version) {
    setError("");
    setNotice("");

    if (jobDescription.trim().length < 80) {
      setError("Paste a fuller job description so the AI can identify responsibilities, keywords, and hiring signals.");
      return;
    }

    if (oldCv.trim().length < 80) {
      setError("Paste or upload your existing CV before generating tailored content.");
      return;
    }

    setMode(selectedMode);
    setNotice("Generating your tailored CV. This can take 15-30 seconds for a full CV.");
    setIsGenerating(true);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 45000);
      const response = await fetch("/api/tailor", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, oldCv, mode: selectedMode, version: selectedVersion })
      });
      window.clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        if (data.fallback) setResult(data.fallback);
        setError(data.error || "Could not generate tailored CV content.");
        return;
      }

      setResult(data);
      setShowExportPrompt(true);
      if (data.warning) {
        setNotice(data.warning);
      } else {
        setNotice("Tailored CV generated. Choose PDF or Word below to download it.");
      }
    } catch (generateError) {
      setError(generateError instanceof DOMException && generateError.name === "AbortError" ? "Generation took too long. Please try again, or shorten the job description/CV text." : "Generation failed. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function applyDraft(draft: Partial<ResumeState>) {
    window.localStorage.setItem(appliedResumeStorageKey, JSON.stringify(draft));
    window.location.href = "/";
  }

  function applyAll() {
    if (!result) return;
    applyDraft(draftFromResult(result, jobDescription));
  }

  function printTailoredCv() {
    if (!result) return;
    const previousTitle = document.title;
    document.title = exportName(result.version).replace(/\.pdf$/i, "");
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 250);
  }

  function downloadTailoredWord() {
    if (!result) return;
    const blob = new Blob([tailoredCvDocumentHtml(result, candidateProfile)], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = wordExportName(result.version);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveCurrentVersion() {
    if (!result) return;
    const saved: SavedCvVersion = {
      id: crypto.randomUUID(),
      name: versionName(result.version),
      createdAt: new Date().toISOString(),
      version: result.version,
      result,
      draft: draftFromResult(result, jobDescription)
    };
    persistVersions([saved, ...savedVersions]);
    setNotice("CV version saved locally.");
  }

  function renameVersion(id: string) {
    const current = savedVersions.find((item) => item.id === id);
    if (!current) return;
    const nextName = window.prompt("Rename CV version", current.name);
    if (!nextName?.trim()) return;
    persistVersions(savedVersions.map((item) => (item.id === id ? { ...item, name: nextName.trim() } : item)));
  }

  function deleteVersion(id: string) {
    persistVersions(savedVersions.filter((item) => item.id !== id));
  }

  async function askAgent(action?: string) {
    const message = action || agentInput.trim();
    if (!message) {
      setError("Ask the AI Career Agent a question or choose a quick action.");
      return;
    }

    setError("");
    setAgentInput("");
    const nextMessages: AgentMessage[] = [...agentMessages, { role: "user", content: message }];
    setAgentMessages(nextMessages);
    setIsAgentThinking(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message, jobDescription, oldCv, version, result, history: nextMessages })
      });
      const data = await response.json();
      if (!response.ok && data.error) setError(data.error);
      setAgentMessages([...nextMessages, { role: "assistant", content: data.reply || "I could not create a suggestion. Please try again.", applyText: data.applyText }]);
    } finally {
      setIsAgentThinking(false);
    }
  }

  return (
    <main className="tailorShell">
      <section className="tailorHero">
        <nav className="tailorNav">
          <Link href="/" className="brandLink">
            <span className="brandMark">CF</span>
            CareerForge
          </Link>
          <Link href="/" className="secondaryButton">Resume Builder</Link>
        </nav>
        <div className="tailorHeroGrid">
          <div>
            <p className="eyebrow">AI CV Tailor & Enhancer</p>
            <h1>Tailor your CV to any job in seconds</h1>
            <p>Paste a job description and your old CV. Our AI creates an ATS-optimized, recruiter-ready resume.</p>
          </div>
          <div className="tailorHeroCard">
            <span>{result ? result.atsScore : "--"}</span>
            <small>{result ? scoreLabel(result.atsScore) : "ATS match score"}</small>
          </div>
        </div>
      </section>

      <section className="tailorWorkspace">
        <div className="versionPanel">
          <div className="cardHeader">
            <div>
              <p className="eyebrow">Choose CV Version</p>
              <h2>Localize your CV for the job market</h2>
            </div>
            <span className="countBadge">{version.language} · {version.format}</span>
          </div>
          <div className="versionGrid">
            <SelectField label="Target language" value={version.language} options={languages} onChange={(value) => updateVersion("language", value)} />
            <SelectField label="CV format" value={version.format} options={formats} onChange={(value) => updateVersion("format", value)} />
            <SelectField label="Tone" value={version.tone} options={tones} onChange={(value) => updateVersion("tone", value)} />
            <SelectField label="Target country" value={version.targetCountry} options={countries} onChange={(value) => updateVersion("targetCountry", value)} />
          </div>
        </div>

        <div className="tailorInputs">
          <div className="tailorCard">
            <div className="cardHeader">
              <div><p className="eyebrow">Step 1</p><h2>Job Description</h2></div>
              <span className="countBadge">{jobDescription.trim().length} chars</span>
            </div>
            <textarea className="largeTextarea" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the full job description here, including responsibilities, required skills, tools, and qualifications." rows={12} />
          </div>

          <div className="tailorCard">
            <div className="cardHeader">
              <div><p className="eyebrow">Step 2</p><h2>Old CV</h2></div>
              <label className="miniUpload">
                {isImporting ? "Importing..." : uploadedCv ? "Replace PDF" : "Upload PDF"}
                <input type="file" accept=".pdf,application/pdf" disabled={isImporting} onChange={(event) => { void importCv(event.target.files?.[0]); event.target.value = ""; }} />
              </label>
            </div>
            {uploadedCv ? (
              <div className="uploadedCvCard">
                <div className="pdfIcon">PDF</div>
                <div>
                  <strong>{uploadedCv.name}</strong>
                  <p>{Math.max(1, Math.round(uploadedCv.size / 1024))} KB · {uploadedCv.text.split(/\s+/).filter(Boolean).length} extracted words</p>
                  <small>We keep your PDF as the uploaded source and use extracted text only for AI analysis.</small>
                </div>
                <div className="uploadedCvActions">
                  <button type="button" onClick={() => setShowExtractedCv((current) => !current)}>
                    {showExtractedCv ? "Hide Preview" : "Preview Text"}
                  </button>
                  <button type="button" onClick={clearUploadedCv}>Remove</button>
                </div>
              </div>
            ) : (
              <textarea className="largeTextarea" value={oldCv} onChange={(event) => setOldCv(event.target.value)} placeholder="Paste your existing CV here, or upload a PDF file." rows={12} />
            )}
            {uploadedCv && showExtractedCv ? (
              <textarea className="extractedPreview" value={oldCv} onChange={(event) => setOldCv(event.target.value)} rows={8} />
            ) : null}
          </div>
        </div>

        <div className="actionDeck">
          <div className="modeGrid">
            {enhancerModes.map((item) => (
              <button className={`modeButton ${mode === item ? "active" : ""}`} key={item} type="button" onClick={() => setMode(item)}>{item}</button>
            ))}
          </div>
          <button className="generateButton" type="button" onClick={() => void generateTailoredCv()} disabled={isGenerating}>{isGenerating ? "Generating tailored CV..." : "Generate Tailored CV"}</button>
          <div className="quickImprove">
            {["German Lebenslauf", "European CV", "Executive CV", "Entry-Level CV"].map((format) => (
              <button key={format} type="button" onClick={() => { const next = { ...version, format, language: format === "German Lebenslauf" ? "German" : version.language, targetCountry: format === "German Lebenslauf" ? "Germany" : version.targetCountry }; setVersion(next); void generateTailoredCv(format, next); }} disabled={isGenerating}>Create {format}</button>
            ))}
          </div>
          {error ? <p className="errorBox">{error}</p> : null}
          {notice ? <p className="noticeBox">{notice}</p> : null}
        </div>

        <SavedVersions versions={savedVersions} onApply={(item) => applyDraft(item.draft)} onPreview={(item) => setResult(item.result)} onRename={renameVersion} onDelete={deleteVersion} />

        <CareerAgent messages={agentMessages} input={agentInput} setInput={setAgentInput} isLoading={isAgentThinking} onAsk={askAgent} onApply={(text) => applyDraft({ summary: text })} />

        {!result ? (
          <div className="emptyState"><h2>Your tailored CV analysis will appear here</h2><p>Generate once to see ATS scoring, market fit, localized headings, keyword gaps, rewritten bullets, project ideas, and a cover letter draft.</p></div>
        ) : (
          <section className="resultsGrid" aria-label="Tailored CV results">
            <div className="scoreModule">
              <div className="scoreRing" style={{ "--score": `${result.atsScore}%` } as CSSProperties}><span>{result.atsScore}</span></div>
              <div>
                <p className="eyebrow">ATS score</p>
                <h2>{scoreLabel(result.atsScore)}</h2>
                <p>Market fit: <strong>{result.marketFitScore}/100</strong>. Version: {result.version.language}, {result.version.format}, {result.version.targetCountry}.</p>
              </div>
              <div className="scoreActions">
                <button className="primaryButton" type="button" onClick={applyAll}>Apply Full Tailored CV</button>
                <button className="secondaryButton" type="button" onClick={printTailoredCv}>Export Tailored PDF</button>
                <button className="secondaryButton" type="button" onClick={downloadTailoredWord}>Export Word</button>
                <button className="secondaryButton" type="button" onClick={saveCurrentVersion}>Save Version</button>
              </div>
            </div>

            {showExportPrompt ? (
              <div className="exportPrompt">
                <div>
                  <p className="eyebrow">Ready to download</p>
                  <h2>Choose your CV file type</h2>
                  <p>Your tailored CV has been generated. Download a polished PDF, or get a Word file for final manual editing.</p>
                </div>
                <div className="exportPromptActions">
                  <button className="primaryButton" type="button" onClick={printTailoredCv}>Download PDF</button>
                  <button className="secondaryButton" type="button" onClick={downloadTailoredWord}>Download Word</button>
                  <button className="secondaryButton" type="button" onClick={() => setShowExportPrompt(false)}>Keep Editing</button>
                </div>
              </div>
            ) : null}

            <article className="printableTailoredResume premiumTailoredResume">
              <header className="resumePrintHeader">
                <div>
                  <h1>{candidateProfile.name}</h1>
                  <p>{candidateProfile.role}</p>
                </div>
                <ul className="printContactList">
                  {[candidateProfile.location, candidateProfile.email, candidateProfile.phone, ...candidateProfile.links].filter(Boolean).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </header>

              {candidateProfile.workAuthorization ? <p className="workAuthorization">{candidateProfile.workAuthorization}</p> : null}

              <div className="printResumeMeta">
                <span>{result.version.format}</span>
                <span>{result.version.targetCountry}</span>
                <span>{result.version.language}</span>
                <span>{result.version.tone}</span>
              </div>

              <div className="printResumeBody">
                <main>
                  <section>
                    <h2>{result.localizedHeadings.summary}</h2>
                    <p>{result.professionalSummary}</p>
                  </section>

                  <section>
                    <h2>{result.localizedHeadings.experience}</h2>
                    {result.experience.map((item, index) => (
                      <div className="printExperience" key={`${item.role}-${index}`}>
                        <h3>{[item.role, item.company].filter(Boolean).join(" | ") || "Experience"}</h3>
                        <ul>
                          {item.rewrittenBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                        </ul>
                      </div>
                    ))}
                  </section>

                  {result.projects.length ? (
                    <section>
                      <h2>{result.localizedHeadings.projects}</h2>
                      <ul>{result.projects.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null}
                </main>

                <aside>
                  <section>
                    <h2>{result.localizedHeadings.skills}</h2>
                    <div className="printSkillList">
                      {(result.skills.matched.length ? result.skills.matched : result.skills.recommended).map((item) => <span key={item}>{item}</span>)}
                    </div>
                  </section>

                  {candidateProfile.education.length ? (
                    <section>
                      <h2>{result.localizedHeadings.education}</h2>
                      <ul>{candidateProfile.education.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null}

                  {candidateProfile.certifications.length ? (
                    <section>
                      <h2>{result.localizedHeadings.certifications}</h2>
                      <ul>{candidateProfile.certifications.map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null}

                  {result.skills.missing.length ? (
                    <section className="printOnlyScreen">
                      <h2>Keywords to Confirm</h2>
                      <ul>{result.skills.missing.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null}
                </aside>
              </div>
            </article>

            <article className="printableTailoredResume legacyTailoredResume">
              <header>
                <div>
                  <h1>Abhishek Rahul</h1>
                  <p>{result.version.format} · {result.version.targetCountry}</p>
                </div>
                <span>{result.version.language}</span>
              </header>

              <section>
                <h2>{result.localizedHeadings.summary}</h2>
                <p>{result.professionalSummary}</p>
              </section>

              <section>
                <h2>{result.localizedHeadings.experience}</h2>
                {result.experience.map((item, index) => (
                  <div className="printExperience" key={`${item.role}-${index}`}>
                    <h3>{[item.role, item.company].filter(Boolean).join(" · ") || "Experience"}</h3>
                    <ul>
                      {item.rewrittenBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  </div>
                ))}
              </section>

              <section>
                <h2>{result.localizedHeadings.skills}</h2>
                <p>{joinList(result.skills.recommended.length ? result.skills.recommended : result.skills.matched)}</p>
              </section>

              {result.projects.length ? (
                <section>
                  <h2>{result.localizedHeadings.projects}</h2>
                  <ul>{result.projects.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ) : null}

              {result.certificationSuggestions.length ? (
                <section>
                  <h2>{result.localizedHeadings.certifications}</h2>
                  <ul>{result.certificationSuggestions.map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
              ) : null}
            </article>

            <ResultCard title="Localized Headings">
              <div className="headingGrid">
                {Object.entries(result.localizedHeadings).map(([key, value]) => <span key={key}><small>{key}</small>{value}</span>)}
              </div>
            </ResultCard>

            <ResultCard title={result.localizedHeadings.summary} actionLabel="Apply Summary" onApply={() => applyDraft({ summary: result.professionalSummary })}><p>{result.professionalSummary}</p></ResultCard>

            <ResultCard title="Keyword Analysis">
              <KeywordBlock title="Matched" items={result.skills.matched} tone="matched" />
              <KeywordBlock title="Missing" items={result.skills.missing} tone="missing" />
              <KeywordBlock title="Recommended Skills" items={result.skills.recommended} tone="recommended" />
              <button className="secondaryButton" type="button" onClick={() => applyDraft({ skills: joinList(result.skills.recommended) })}>Apply Skills</button>
            </ResultCard>

            <ResultCard title={result.localizedHeadings.experience} actionLabel="Apply Bullets" onApply={() => applyDraft({ experience: joinBullets(allBullets) })}>
              {result.experience.map((item, index) => <div className="experienceResult" key={`${item.role}-${index}`}><strong>{[item.role, item.company].filter(Boolean).join(" - ") || "Experience"}</strong><ul>{item.rewrittenBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div>)}
            </ResultCard>

            <ResultCard title="Country & Market Tips">
              <KeywordBlock title="Country-specific tips" items={result.countrySpecificTips} tone="recommended" />
              <KeywordBlock title="Language suggestions" items={result.languageSuggestions} tone="recommended" />
              <KeywordBlock title="Agent suggestions" items={result.agentSuggestions} tone="matched" />
            </ResultCard>

            <ResultCard title={result.localizedHeadings.projects} actionLabel="Apply Projects" onApply={() => applyDraft({ projects: joinBullets(result.projects) })}><ul>{result.projects.map((item) => <li key={item}>{item}</li>)}</ul></ResultCard>

            <ResultCard title={`${result.localizedHeadings.education} & ${result.localizedHeadings.certifications}`} actionLabel="Apply Certifications" onApply={() => applyDraft({ certifications: joinBullets(result.certificationSuggestions), education: joinBullets(result.educationSuggestions) })}>
              <KeywordBlock title="Education Suggestions" items={result.educationSuggestions} tone="recommended" />
              <KeywordBlock title="Certification Suggestions" items={result.certificationSuggestions} tone="recommended" />
            </ResultCard>

            <ResultCard title="Cover Letter Draft"><pre className="coverLetter">{result.coverLetter}</pre></ResultCard>
            <ResultCard title="Improvement Tips"><ul>{result.improvementTips.map((item) => <li key={item}>{item}</li>)}</ul></ResultCard>

            <div className="comparisonPanel"><div><p className="eyebrow">Original</p><p>{oldCv.slice(0, 900)}{oldCv.length > 900 ? "..." : ""}</p></div><div><p className="eyebrow">Enhanced</p><p>{result.professionalSummary}</p><ul>{allBullets.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul></div></div>
          </section>
        )}
      </section>
    </main>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function SavedVersions({ versions, onApply, onPreview, onRename, onDelete }: { versions: SavedCvVersion[]; onApply: (item: SavedCvVersion) => void; onPreview: (item: SavedCvVersion) => void; onRename: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <section className="versionPanel">
      <div className="cardHeader"><div><p className="eyebrow">Saved CV Versions</p><h2>Manage generated versions</h2></div><span className="countBadge">{versions.length} saved</span></div>
      {versions.length ? <div className="savedVersionList">{versions.map((item) => <article className="savedVersion" key={item.id}><div><strong>{item.name}</strong><p>{item.version.language} · {item.version.format} · {item.version.targetCountry}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div><div><button onClick={() => onPreview(item)} type="button">Preview</button><button onClick={() => onApply(item)} type="button">Apply</button><button onClick={() => onRename(item.id)} type="button">Rename</button><button onClick={() => onDelete(item.id)} type="button">Delete</button></div></article>)}</div> : <p className="mutedText">No saved versions yet. Generate a CV and click Save Version.</p>}
    </section>
  );
}

function CareerAgent({ messages, input, setInput, isLoading, onAsk, onApply }: { messages: AgentMessage[]; input: string; setInput: (value: string) => void; isLoading: boolean; onAsk: (action?: string) => void; onApply: (text: string) => void }) {
  return (
    <section className="agentPanel">
      <div className="cardHeader"><div><p className="eyebrow">AI Career Agent</p><h2>Improve your resume step by step</h2></div></div>
      <div className="quickImprove">{quickActions.map((item) => <button key={item} type="button" onClick={() => onAsk(item)} disabled={isLoading}>{item}</button>)}</div>
      <div className="chatBox">{messages.map((message, index) => <div className={`chatMessage ${message.role}`} key={`${message.role}-${index}`}><p>{message.content}</p>{message.role === "assistant" ? <div className="chatActions"><button type="button" onClick={() => navigator.clipboard.writeText(message.content)}>Copy</button><button type="button" onClick={() => onApply(message.applyText || message.content)}>Apply Suggestion</button></div> : null}</div>)}{isLoading ? <div className="chatMessage assistant"><p>Thinking...</p></div> : null}</div>
      <div className="agentInput"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask: Can you make this CV suitable for Germany?" onKeyDown={(event) => { if (event.key === "Enter") onAsk(); }} /><button type="button" onClick={() => onAsk()} disabled={isLoading}>Send</button></div>
    </section>
  );
}

function ResultCard({ title, actionLabel, onApply, children }: { title: string; actionLabel?: string; onApply?: () => void; children: ReactNode }) {
  return <article className="resultCard"><div className="cardHeader"><h2>{title}</h2>{actionLabel && onApply ? <button className="secondaryButton" type="button" onClick={onApply}>{actionLabel}</button> : null}</div>{children}</article>;
}

function KeywordBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <div className="keywordBlock"><h3>{title}</h3><div className="keywordList">{items.length ? items.map((item) => <span className={tone} key={item}>{item}</span>) : <small>No items yet</small>}</div></div>;
}
