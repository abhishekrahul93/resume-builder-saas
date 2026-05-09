"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  accountStorageKey,
  appliedResumeStorageKey,
  initialResume,
  listFromText,
  savedResumesStorageKey,
  sectionOrderStorageKey,
  type ResumeState
} from "@/lib/resume";
import { selectedTemplateStorageKey } from "@/lib/templates";

type BuilderView = "resume" | "cover" | "jobkit";
type BuilderStep = "upload" | "template" | "improve" | "download";
type SectionKey = "summary" | "experience" | "skills" | "projects" | "education" | "certifications";
type Plan = "free" | "pro";
type Account = {
  name: string;
  email: string;
  plan: Plan;
};
type SavedResume = {
  id: string;
  name: string;
  template: string;
  updatedAt: string;
  resume: ResumeState;
};

const templateLabels: Record<string, string> = {
  ats: "ATS Professional",
  euro: "European CV",
  executive: "Modern Executive"
};

const templateDescriptions: Record<string, string> = {
  ats: "Clean ATS-safe format for most job applications.",
  euro: "Formal European style for Germany and EU roles.",
  executive: "Premium modern layout for senior candidates."
};

const templates = ["ats", "euro", "executive"] as const;
const proTemplates = new Set<string>();
const builderSteps: Array<{ key: BuilderStep; label: string; title: string }> = [
  { key: "upload", label: "1 Upload", title: "Start with your CV" },
  { key: "template", label: "2 Template", title: "Choose the best layout" },
  { key: "improve", label: "3 Improve", title: "Edit and improve content" },
  { key: "download", label: "4 Download", title: "Export your application" }
];
const defaultSectionOrder: SectionKey[] = ["summary", "experience", "skills", "projects", "education", "certifications"];
const sectionLabels: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Experience",
  skills: "Core Skills",
  projects: "Selected Projects",
  education: "Education",
  certifications: "Certifications"
};

function calculateScore(resume: ResumeState) {
  let score = 45;
  score += resume.summary.length > 120 ? 12 : 4;
  score += listFromText(resume.experience).length >= 3 ? 14 : 6;
  score += listFromText(resume.skills).length >= 6 ? 11 : 5;
  score += resume.email && resume.phone ? 8 : 0;
  score += /\d|%|reduced|increased|improved|automated/i.test(resume.experience) ? 10 : 0;
  score += resume.targetJob.length > 40 ? 5 : 0;
  score += resume.education.length > 20 ? 4 : 0;
  score += resume.projects.length > 20 ? 4 : 0;
  return Math.min(score, 98);
}

function qualityChecks(resume: ResumeState) {
  return [
    { label: "Contact details", done: Boolean(resume.email && resume.phone) },
    { label: "Target role", done: resume.role.length > 2 && resume.targetJob.length > 30 },
    { label: "Strong summary", done: resume.summary.length > 120 },
    { label: "Achievement bullets", done: listFromText(resume.experience).length >= 3 },
    { label: "Measurable impact", done: /\d|%|reduced|increased|improved|automated|faster/i.test(resume.experience) },
    { label: "Skills density", done: listFromText(resume.skills).length >= 6 },
    { label: "Education", done: resume.education.length > 20 }
  ];
}

function coverLetterFromResume(resume: ResumeState) {
  const companySignal = resume.targetJob.match(/\b(?:at|for|with)\s+([A-Z][A-Za-z0-9&.\-\s]{2,40})/)?.[1]?.trim();
  return [
    `Dear Hiring Team${companySignal ? ` at ${companySignal}` : ""},`,
    "",
    `I am excited to apply for the ${resume.role || "open"} role. My background combines ${listFromText(resume.skills).slice(0, 4).join(", ")} with practical experience delivering measurable business outcomes.`,
    "",
    resume.summary,
    "",
    `In my recent work, I have focused on ${listFromText(resume.experience).slice(0, 2).join(" and ")}. I would welcome the opportunity to bring the same structured, impact-driven approach to your team.`,
    "",
    "Thank you for your time and consideration. I would be glad to discuss how my experience can support your goals.",
    "",
    `Sincerely,\n${resume.name}`
  ].join("\n");
}

function jobKitInsights(resume: ResumeState) {
  const skills = listFromText(resume.skills);
  const bullets = listFromText(resume.experience);
  return [
    { label: "Add 8-14 targeted skills", status: skills.length >= 8 ? "Strong" : "Improve", detail: `${skills.length} skills detected` },
    { label: "Use metrics in experience", status: /\d|%|reduced|increased|improved|automated|saved/i.test(resume.experience) ? "Strong" : "Improve", detail: "Recruiters scan for measurable impact" },
    { label: "Keep bullets concise", status: bullets.every((item) => item.length < 180) ? "Strong" : "Improve", detail: "Short bullets improve readability" },
    { label: "Target job context", status: resume.targetJob.length > 80 ? "Strong" : "Improve", detail: "Tailoring needs the job description" },
    { label: "Matching cover letter", status: resume.summary.length > 80 ? "Ready" : "Improve", detail: "Generated from your current resume" }
  ];
}

function targetJobFeedback(resume: ResumeState) {
  const targetWords = Array.from(new Set((resume.targetJob.toLowerCase().match(/\b[a-z][a-z+#.-]{3,}\b/g) || []).filter((word) => !["with", "this", "that", "from", "your", "will", "role", "work", "team", "using", "have", "their"].includes(word)))).slice(0, 18);
  const resumeText = `${resume.summary} ${resume.experience} ${resume.skills} ${resume.projects}`.toLowerCase();
  const matched = targetWords.filter((word) => resumeText.includes(word)).slice(0, 8);
  const missing = targetWords.filter((word) => !resumeText.includes(word)).slice(0, 8);
  return {
    matched,
    missing,
    suggestions: [
      missing.length ? `Add these keywords only where true: ${missing.slice(0, 5).join(", ")}.` : "Good keyword coverage for the target job.",
      /\d|%|reduced|increased|improved|automated|saved/i.test(resume.experience) ? "Your experience includes measurable impact." : "Add numbers to 2-3 bullets, such as time saved, reports automated, revenue influenced, or accuracy improved.",
      resume.targetJob.length > 80 ? "Target job context is strong." : "Paste the full job description to get stronger tailoring feedback."
    ]
  };
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeSectionOrder(value: SectionKey[]) {
  const valid = value.filter((item): item is SectionKey => defaultSectionOrder.includes(item));
  return [...valid, ...defaultSectionOrder.filter((item) => !valid.includes(item))];
}

export default function Home() {
  const [resume, setResume] = useState(initialResume);
  const [template, setTemplate] = useState<(typeof templates)[number]>("ats");
  const [builderView, setBuilderView] = useState<BuilderView>("resume");
  const [activeStep, setActiveStep] = useState<BuilderStep>("upload");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [enhancingSection, setEnhancingSection] = useState<SectionKey | "">("");
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(defaultSectionOrder);
  const [draggedSection, setDraggedSection] = useState<SectionKey | null>(null);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const contact = [resume.location, resume.email, resume.phone, resume.links].filter(Boolean);
  const bullets = useMemo(() => listFromText(resume.experience), [resume.experience]);
  const education = useMemo(() => listFromText(resume.education), [resume.education]);
  const projects = useMemo(() => listFromText(resume.projects), [resume.projects]);
  const certifications = useMemo(() => listFromText(resume.certifications), [resume.certifications]);
  const skills = useMemo(() => listFromText(resume.skills), [resume.skills]);
  const checks = qualityChecks(resume);
  const score = calculateScore(resume);
  const coverLetter = useMemo(() => coverLetterFromResume(resume), [resume]);
  const kitInsights = useMemo(() => jobKitInsights(resume), [resume]);
  const jobFeedback = useMemo(() => targetJobFeedback(resume), [resume]);
  const activeStepTitle = builderSteps.find((step) => step.key === activeStep)?.title || "Build your resume";

  useEffect(() => {
    const storedAccount = safeParse<Account | null>(window.localStorage.getItem(accountStorageKey), null);
    const storedResumes = safeParse<SavedResume[]>(window.localStorage.getItem(savedResumesStorageKey), []);
    const storedOrder = normalizeSectionOrder(safeParse<SectionKey[]>(window.localStorage.getItem(sectionOrderStorageKey), defaultSectionOrder));
    const selectedTemplate = window.localStorage.getItem(selectedTemplateStorageKey);
    queueMicrotask(() => {
      setAccount(storedAccount);
      setSavedResumes(storedResumes);
      setSectionOrder(storedOrder);
      if (templates.includes(selectedTemplate as (typeof templates)[number])) {
        setTemplate(selectedTemplate as (typeof templates)[number]);
      }
    });

    const applied = window.localStorage.getItem(appliedResumeStorageKey);
    if (!applied) {
      return;
    }

    try {
      const parsed = JSON.parse(applied) as Partial<ResumeState>;
      queueMicrotask(() => {
        setResume((current) => ({ ...current, ...parsed }));
        setImportMessage("Tailored CV content applied. Review, edit, then export.");
        window.localStorage.removeItem(appliedResumeStorageKey);
      });
    } catch {
      window.localStorage.removeItem(appliedResumeStorageKey);
    }
  }, []);

  function updateField(field: keyof ResumeState, value: string) {
    setResume((current) => ({ ...current, [field]: value }));
  }

  function signInDemo() {
    const demoAccount: Account = {
      name: resume.name || "CareerForge User",
      email: resume.email || "user@careerforge.ai",
      plan: "free"
    };
    setAccount(demoAccount);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(demoAccount));
    setImportMessage("Demo account created. Real auth can connect to Supabase next.");
  }

  function upgradeToPro() {
    if (!account) {
      signInDemo();
    }
    const nextAccount: Account = {
      ...(account || { name: resume.name || "CareerForge User", email: resume.email || "user@careerforge.ai" }),
      plan: "pro"
    };
    setAccount(nextAccount);
    window.localStorage.setItem(accountStorageKey, JSON.stringify(nextAccount));
    setUpgradeMessage("Pro mode unlocked locally. Stripe checkout can be connected with live keys next.");
  }

  function signOut() {
    setAccount(null);
    window.localStorage.removeItem(accountStorageKey);
  }

  function chooseTemplate(option: (typeof templates)[number]) {
    if (proTemplates.has(option) && account?.plan !== "pro") {
      setUpgradeMessage(`${templateLabels[option]} is a Pro template. Upgrade to unlock premium templates and unlimited saved resumes.`);
      return;
    }
    setTemplate(option);
    setUpgradeMessage("");
  }

  function persistSavedResumes(next: SavedResume[]) {
    setSavedResumes(next);
    window.localStorage.setItem(savedResumesStorageKey, JSON.stringify(next));
  }

  function saveResumeSnapshot() {
    if (!account) {
      setUpgradeMessage("Create a free account first to save resumes.");
      return;
    }
    if (account.plan === "free" && savedResumes.length >= 2) {
      setUpgradeMessage("Free plan includes 2 saved resumes. Upgrade to Pro for unlimited versions.");
      return;
    }
    const snapshot: SavedResume = {
      id: crypto.randomUUID(),
      name: `${resume.role || "Resume"} - ${new Date().toLocaleDateString()}`,
      template,
      updatedAt: new Date().toISOString(),
      resume
    };
    persistSavedResumes([snapshot, ...savedResumes]);
    setImportMessage("Resume saved to your local CareerForge account.");
  }

  function loadSavedResume(item: SavedResume) {
    setResume(item.resume);
    if (templates.includes(item.template as (typeof templates)[number])) {
      setTemplate(item.template as (typeof templates)[number]);
    }
    setImportMessage("Saved resume loaded.");
  }

  function deleteSavedResume(id: string) {
    persistSavedResumes(savedResumes.filter((item) => item.id !== id));
  }

  function moveSection(from: SectionKey, to: SectionKey) {
    const fromIndex = sectionOrder.indexOf(from);
    const toIndex = sectionOrder.indexOf(to);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...sectionOrder];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, from);
    setSectionOrder(next);
    window.localStorage.setItem(sectionOrderStorageKey, JSON.stringify(next));
  }

  function nudgeSection(section: SectionKey, direction: -1 | 1) {
    const index = sectionOrder.indexOf(section);
    const target = sectionOrder[index + direction];
    if (!target) return;
    moveSection(section, target);
  }

  async function enhanceSection(section: SectionKey) {
    setEnhancingSection(section);
    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: resume.role,
          summary: section === "summary" ? `${resume.summary}\n\nTarget job: ${resume.targetJob}` : resume.summary,
          experience:
            section === "experience"
              ? resume.experience
              : section === "projects"
                ? resume.projects
                : section === "skills"
                  ? resume.skills
                  : section === "education"
                    ? resume.education
                    : resume.certifications
        })
      });
      const enhanced = await response.json();
      setResume((current) => {
        if (section === "summary") return { ...current, summary: enhanced.summary || current.summary };
        const improvedText = Array.isArray(enhanced.bullets) ? enhanced.bullets.join("\n") : "";
        if (!improvedText) return current;
        if (section === "experience") return { ...current, experience: improvedText };
        if (section === "projects") return { ...current, projects: improvedText };
        if (section === "skills") return { ...current, skills: improvedText };
        if (section === "education") return { ...current, education: improvedText };
        return { ...current, certifications: improvedText };
      });
    } finally {
      setEnhancingSection("");
    }
  }

  async function enhanceResume() {
    setIsEnhancing(true);

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: resume.role,
          summary: `${resume.summary}\n\nTarget job: ${resume.targetJob}`,
          experience: `${resume.experience}\n${resume.projects}`
        })
      });

      const enhanced = await response.json();
      setResume((current) => ({
        ...current,
        summary: enhanced.summary || current.summary,
        experience: Array.isArray(enhanced.bullets) ? enhanced.bullets.join("\n") : current.experience
      }));
    } finally {
      setIsEnhancing(false);
    }
  }

  async function importCv(file: File | undefined) {
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportMessage("");

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-cv", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      const imported = await response.json();

      if (!response.ok) {
        setImportMessage(imported.error || "Could not import this CV.");
        return;
      }

      setResume((current) => ({
        ...current,
        name: imported.name || current.name,
        role: imported.role || current.role,
        email: imported.email || current.email,
        phone: imported.phone || current.phone,
        links: imported.links || current.links,
        summary: imported.summary || current.summary,
        experience: imported.experience || current.experience,
        skills: imported.skills || current.skills,
        education: imported.education || current.education,
        projects: imported.projects || current.projects,
        certifications: imported.certifications || current.certifications
      }));
      setImportMessage("CV imported. Review the fields, then enhance it.");
    } catch (importError) {
      setImportMessage(importError instanceof DOMException && importError.name === "AbortError" ? "CV import took too long. Please try a smaller PDF or upload a DOCX/TXT version." : "Could not upload this CV. Please try again or use DOCX/TXT.");
    } finally {
      setIsImporting(false);
    }
  }

  function exportHeadings() {
    if (resume.versionLanguage === "German" || resume.versionFormat === "German Lebenslauf") {
      return {
        summary: "Profil",
        skills: "F\u00e4higkeiten",
        experience: "Berufserfahrung",
        education: "Ausbildung",
        projects: "Projekte",
        certifications: "Zertifizierungen",
        languages: "Sprachen"
      };
    }

    if (template === "euro" || resume.versionFormat === "European CV") {
      return {
        summary: "Profile",
        skills: "Skills",
        experience: "Professional Experience",
        education: "Education",
        projects: "Projects",
        certifications: "Certifications",
        languages: "Languages"
      };
    }

    return {
      summary: "Professional Summary",
      skills: "Core Skills",
      experience: "Experience",
      education: "Education",
      projects: "Selected Projects",
      certifications: "Certifications",
      languages: "Languages"
    };
  }

  async function downloadResumePdf() {
    setIsDownloadingPdf(true);
    setImportMessage("");

    const fileName = resume.exportFileName || `${(resume.name || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cv.pdf`;
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        profile: {
          name: resume.name,
          role: resume.role,
          location: resume.location,
          email: resume.email,
          phone: resume.phone,
          links: resume.links.split("|").map((item) => item.trim()).filter(Boolean),
          education,
          certifications
        },
        result: {
          version: {
            language: resume.versionLanguage || "English",
            format: resume.versionFormat || templateLabels[template],
            targetCountry: resume.location.includes("Germany") ? "Germany" : "",
            tone: "Professional",
            designStyle: template === "euro" ? "European Formal" : template === "executive" ? "Executive" : "ATS Standard"
          },
          localizedHeadings: exportHeadings(),
          professionalSummary: resume.summary,
          skills: {
            matched: skills,
            recommended: [],
            missing: []
          },
          experience: [
            {
              role: resume.experienceTitle,
              company: "",
              rewrittenBullets: bullets
            }
          ],
          projects
        }
      })
    });

    if (!response.ok) {
      setImportMessage("Could not create PDF. Please try again.");
      setIsDownloadingPdf(false);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsDownloadingPdf(false);
    setImportMessage("PDF downloaded without browser headers.");
  }

  function renderResumeSection(section: SectionKey) {
    if (section === "summary") {
      return (
        <section key={section}>
          <h3>{sectionLabels.summary}</h3>
          <p>{resume.summary}</p>
        </section>
      );
    }

    if (section === "experience") {
      return (
        <section key={section}>
          <h3>{sectionLabels.experience}</h3>
          <div className="experienceHeading">
            <strong>{resume.experienceTitle || "Role, Company"}</strong>
            <span>{resume.experienceDates}</span>
          </div>
          <ul>
            {bullets.map((item) => (
              <li key={item}>{item.replace(/^[-*]\s*/, "")}</li>
            ))}
          </ul>
        </section>
      );
    }

    if (section === "skills") {
      return (
        <section key={section}>
          <h3>{sectionLabels.skills}</h3>
          <div className="skillList">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
      );
    }

    if (section === "projects" && projects.length) {
      return (
        <section key={section}>
          <h3>{sectionLabels.projects}</h3>
          <ul>
            {projects.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    }

    if (section === "education" && education.length) {
      return (
        <section key={section}>
          <h3>{sectionLabels.education}</h3>
          <ul>
            {education.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    }

    if (section === "certifications" && certifications.length) {
      return (
        <section key={section}>
          <h3>{sectionLabels.certifications}</h3>
          <ul>
            {certifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    }

    return null;
  }

  return (
    <main className="appShell">
      <aside className="builderPanel" aria-label="Resume builder controls">
        <div className="brandRow">
          <div className="brandMark">CF</div>
          <div>
            <p className="eyebrow">CareerForge</p>
            <h1>Resume Builder</h1>
          </div>
        </div>

        <div className="toolbar" aria-label="Resume actions">
          <Link className="secondaryButton" href="/tailor">
            AI Tailor
          </Link>
          <Link className="secondaryButton" href="/templates">
            Templates
          </Link>
          <Link className="secondaryButton" href="/dashboard">
            Dashboard
          </Link>
          <button className="primaryButton" type="button" onClick={enhanceResume} disabled={isEnhancing}>
            {isEnhancing ? "Enhancing..." : "Enhance CV"}
          </button>
          <button className="iconButton" type="button" onClick={() => void downloadResumePdf()} aria-label="Download PDF" disabled={isDownloadingPdf}>
            {isDownloadingPdf ? "..." : "PDF"}
          </button>
        </div>

        <section className="simpleFlowPanel" aria-label="Main resume builder flow">
          <p className="eyebrow">Simple workflow</p>
          <h2>{activeStepTitle}</h2>
          <div className="simpleFlowSteps">
            {builderSteps.map((step) => (
              <button
                className={activeStep === step.key ? "active" : ""}
                key={step.key}
                type="button"
                onClick={() => setActiveStep(step.key)}
              >
                {step.label}
              </button>
            ))}
          </div>
          <p className="helperText">Keep the main flow simple. Advanced account, save, and reorder tools stay tucked away until you need them.</p>
        </section>

        <section className={`uploadPanel wizardPanel ${activeStep === "upload" ? "active" : "muted"}`} aria-label="Import existing CV">
          <div>
            <h2>Import Existing CV</h2>
            <p>Upload a PDF, DOCX, or TXT resume to fill the builder automatically.</p>
          </div>
          <label className="fileButton">
            {isImporting ? "Importing..." : "Upload CV"}
            <input
              type="file"
              accept=".docx,.txt,.pdf"
              disabled={isImporting}
              onChange={(event) => {
                void importCv(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {importMessage ? <p className="importMessage">{importMessage}</p> : null}
        </section>

        <section className={`templateFocusPanel wizardPanel ${activeStep === "template" ? "active" : "muted"}`}>
          <div>
            <p className="eyebrow">Choose Template</p>
            <h2>Three polished resume styles</h2>
          </div>
          <Link className="templateGalleryLink" href="/templates">Open full template gallery</Link>
          <div className="templateGallery compactTemplateGallery" role="group" aria-label="Choose resume template">
            {templates.map((option) => (
              <button
                className={`templateOption ${template === option ? "active" : ""}`}
                key={option}
                type="button"
                onClick={() => chooseTemplate(option)}
              >
                <strong>{templateLabels[option]}</strong>
                <small>{templateDescriptions[option]}</small>
              </button>
            ))}
          </div>
        </section>

        <section className={`jobFeedbackPanel wizardPanel ${activeStep === "improve" ? "active" : "muted"}`} aria-label="Job description feedback">
          <div className="scorePanelHeader">
            <div>
              <p className="eyebrow">Job Feedback</p>
              <h2>{score}/98</h2>
            </div>
            <span>{jobFeedback.matched.length}/{jobFeedback.matched.length + jobFeedback.missing.length || 1}</span>
          </div>
          <div className="feedbackColumns">
            <div>
              <h3>Matched keywords</h3>
              <p>{jobFeedback.matched.length ? jobFeedback.matched.join(", ") : "Paste a full job description to compare keywords."}</p>
            </div>
            <div>
              <h3>Improve next</h3>
              <ul>{jobFeedback.suggestions.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className={`downloadPanel wizardPanel ${activeStep === "download" ? "active" : "muted"}`} aria-label="Download resume">
          <div>
            <p className="eyebrow">Ready to download</p>
            <h2>Export a clean PDF or continue tailoring</h2>
            <p>Your resume is live on the right. Use PDF when you are ready, or open AI Tailor for a job-specific version.</p>
          </div>
          <div className="downloadActions">
            <button className="primaryButton" type="button" onClick={() => void downloadResumePdf()} disabled={isDownloadingPdf}>
              {isDownloadingPdf ? "Preparing..." : "Download PDF"}
            </button>
            <Link className="secondaryButton" href="/tailor">Tailor for a Job</Link>
          </div>
        </section>

        <details className="advancedBuilderTools">
          <summary>Advanced tools: account, save, reorder sections</summary>

        <section className="accountPanel" aria-label="Account and plan">
          {account ? (
            <>
              <div>
                <p className="eyebrow">Account</p>
                <h2>{account.name}</h2>
                <p>{account.email}</p>
              </div>
              <div className="accountActions">
                <span className={account.plan === "pro" ? "planBadge pro" : "planBadge"}>{account.plan === "pro" ? "Pro" : "Free"}</span>
                <button type="button" onClick={saveResumeSnapshot}>Save Resume</button>
                {account.plan !== "pro" ? <button type="button" onClick={upgradeToPro}>Upgrade</button> : null}
                <button type="button" onClick={signOut}>Sign out</button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="eyebrow">Account</p>
                <h2>Save resumes and unlock Pro tools</h2>
                <p>Demo login now, Supabase auth next.</p>
              </div>
              <button type="button" onClick={signInDemo}>Create Free Account</button>
            </>
          )}
          {upgradeMessage ? <p className="upgradeMessage">{upgradeMessage}</p> : null}
        </section>

        <section className="platformPanel" aria-label="CareerForge product workflow">
          <p className="eyebrow">Application Studio</p>
          <h2>Build, tailor, export, and track one job-ready application kit.</h2>
          <div className="workflowSteps">
            <span className="done">Import</span>
            <span className={resume.targetJob.length > 40 ? "done" : ""}>Target</span>
            <span className={score > 75 ? "done" : ""}>Optimize</span>
            <span className={score > 85 ? "done" : ""}>Export</span>
          </div>
        </section>

        <section className="uploadPanel" aria-label="Import existing CV">
          <div>
            <h2>Import Existing CV</h2>
            <p>Upload a PDF, DOCX, or TXT resume to fill the builder automatically.</p>
          </div>
          <label className="fileButton">
            {isImporting ? "Importing..." : "Upload CV"}
            <input
              type="file"
              accept=".docx,.txt,.pdf"
              disabled={isImporting}
              onChange={(event) => {
                void importCv(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {importMessage ? <p className="importMessage">{importMessage}</p> : null}
        </section>

        <section className="scorePanel" aria-label="Resume quality checklist">
          <div className="scorePanelHeader">
            <div>
              <p className="eyebrow">Readiness</p>
              <h2>{score}/98</h2>
            </div>
            <span>{checks.filter((check) => check.done).length}/{checks.length}</span>
          </div>
          <div className="checkList">
            {checks.map((check) => (
              <div className={`checkItem ${check.done ? "done" : ""}`} key={check.label}>
                <span aria-hidden="true">{check.done ? "OK" : ""}</span>
                {check.label}
              </div>
            ))}
          </div>
        </section>

        <section className="controlGroup">
          <h2>Section Studio</h2>
          <p className="helperText">Drag sections to reorder the resume. Use AI Improve for section-level suggestions.</p>
          <div className="sectionStudio">
            {sectionOrder.map((section) => (
              <div
                className="sectionStudioItem"
                draggable
                key={section}
                onDragStart={() => setDraggedSection(section)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedSection) moveSection(draggedSection, section);
                  setDraggedSection(null);
                }}
              >
                <span>{sectionLabels[section]}</span>
                <div>
                  <button type="button" onClick={() => nudgeSection(section, -1)} aria-label={`Move ${sectionLabels[section]} up`}>Up</button>
                  <button type="button" onClick={() => nudgeSection(section, 1)} aria-label={`Move ${sectionLabels[section]} down`}>Down</button>
                  <button type="button" onClick={() => void enhanceSection(section)} disabled={Boolean(enhancingSection)}>
                    {enhancingSection === section ? "Improving..." : "AI Improve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="controlGroup">
          <h2>Saved Resumes</h2>
          {savedResumes.length ? (
            <div className="savedResumeList">
              {savedResumes.map((item) => (
                <article className="savedResumeItem" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{templateLabels[item.template] || item.template} · {new Date(item.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <button type="button" onClick={() => loadSavedResume(item)}>Load</button>
                    <button type="button" onClick={() => deleteSavedResume(item.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="helperText">No saved resumes yet. Create a free account and click Save.</p>
          )}
        </section>
        </details>

        <section className="controlGroup">
          <h2>Profile</h2>
          <Field label="Full name" value={resume.name} onChange={(value) => updateField("name", value)} />
          <Field label="Target role" value={resume.role} onChange={(value) => updateField("role", value)} />
          <TextArea label="Target job description" rows={4} value={resume.targetJob} onChange={(value) => updateField("targetJob", value)} />
          <Field label="Location" value={resume.location} onChange={(value) => updateField("location", value)} />
          <Field label="Email" value={resume.email} onChange={(value) => updateField("email", value)} />
          <Field label="Phone" value={resume.phone} onChange={(value) => updateField("phone", value)} />
          <Field label="Links" value={resume.links} onChange={(value) => updateField("links", value)} />
        </section>

        <section className="controlGroup">
          <h2>Summary</h2>
          <TextArea label="Rough summary" rows={5} value={resume.summary} onChange={(value) => updateField("summary", value)} />
        </section>

        <section className="controlGroup">
          <h2>Experience</h2>
          <Field label="Role and company" value={resume.experienceTitle} onChange={(value) => updateField("experienceTitle", value)} />
          <Field label="Dates" value={resume.experienceDates} onChange={(value) => updateField("experienceDates", value)} />
          <TextArea label="Rough achievements" rows={7} value={resume.experience} onChange={(value) => updateField("experience", value)} />
        </section>

        <section className="controlGroup">
          <h2>Skills</h2>
          <TextArea label="Skills" rows={4} value={resume.skills} onChange={(value) => updateField("skills", value)} />
        </section>

        <section className="controlGroup">
          <h2>Education</h2>
          <TextArea label="Education" rows={4} value={resume.education} onChange={(value) => updateField("education", value)} />
        </section>

        <section className="controlGroup">
          <h2>Projects & Certifications</h2>
          <TextArea label="Projects" rows={4} value={resume.projects} onChange={(value) => updateField("projects", value)} />
          <TextArea label="Certifications" rows={3} value={resume.certifications} onChange={(value) => updateField("certifications", value)} />
        </section>

        <section className="controlGroup">
          <h2 className="legacyTemplateHeading">Template</h2>
          <div className="templateGallery" role="group" aria-label="Choose resume template">
            {templates.map((option) => (
              <button
                className={`templateOption ${template === option ? "active" : ""}`}
                key={option}
                type="button"
                onClick={() => chooseTemplate(option)}
              >
                <strong>{templateLabels[option]}</strong>
                <small>{templateDescriptions[option]}{proTemplates.has(option) ? " · Pro" : ""}</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="previewStage" aria-label="Resume preview">
        <div className="previewTopbar">
          <div>
            <p className="eyebrow">Live application kit</p>
            <h2>{builderView === "resume" ? templateLabels[template] : builderView === "cover" ? "Matching Cover Letter" : "Job Readiness Kit"}</h2>
          </div>
          <div className="viewTabs" role="tablist" aria-label="Preview mode">
            <button className={builderView === "resume" ? "active" : ""} type="button" onClick={() => setBuilderView("resume")}>Resume</button>
            <button className={builderView === "cover" ? "active" : ""} type="button" onClick={() => setBuilderView("cover")}>Cover Letter</button>
            <button className={builderView === "jobkit" ? "active" : ""} type="button" onClick={() => setBuilderView("jobkit")}>Job Kit</button>
          </div>
          <div className="scoreCard" aria-label="Resume strength score">
            <span>{score}</span>
            <small>ATS score</small>
          </div>
        </div>

        {builderView === "resume" ? <article className={`resume ${template}`}>
          <header className="resumeHeader">
            <div>
              <h2>{resume.name || "Your Name"}</h2>
              <p>{resume.role || "Target Role"}</p>
            </div>
            <ul className="contactList">
              {contact.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </header>

          {sectionOrder.map((section) => renderResumeSection(section))}
        </article> : null}

        {builderView === "cover" ? (
          <article className={`resume coverLetterPreview ${template}`}>
            <header className="resumeHeader">
              <div>
                <h2>{resume.name || "Your Name"}</h2>
                <p>Cover Letter for {resume.role || "Target Role"}</p>
              </div>
              <ul className="contactList">
                {contact.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </header>
            <section>
              <h3>Cover Letter Draft</h3>
              <pre>{coverLetter}</pre>
            </section>
          </article>
        ) : null}

        {builderView === "jobkit" ? (
          <section className="jobKitBoard">
            <article className="jobKitHero">
              <p className="eyebrow">Better than a resume builder</p>
              <h2>Complete application readiness</h2>
              <p>CareerForge combines resume building, AI tailoring, multilingual CV versions, cover letter drafting, ATS checks, and export-ready documents in one workflow.</p>
              <Link className="primaryButton" href="/tailor">Open AI CV Tailor</Link>
            </article>
            <div className="jobKitGrid">
              {kitInsights.map((item) => (
                <article className="jobKitCard" key={item.label}>
                  <span className={item.status === "Strong" || item.status === "Ready" ? "strong" : "improve"}>{item.status}</span>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  rows,
  value,
  onChange
}: {
  label: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
