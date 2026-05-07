"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { appliedResumeStorageKey, initialResume, listFromText, type ResumeState } from "@/lib/resume";

type BuilderView = "resume" | "cover" | "jobkit";

const templateLabels: Record<string, string> = {
  modern: "Modern CV",
  classic: "Classic CV",
  compact: "Compact CV",
  executive: "Executive",
  ats: "ATS Pro",
  euro: "European",
  creative: "Creative",
  tech: "Tech"
};

const templateDescriptions: Record<string, string> = {
  modern: "Balanced layout for most professional roles.",
  classic: "Traditional format for formal applications.",
  compact: "Dense one-page style for experienced candidates.",
  executive: "Boardroom-style hierarchy and stronger leadership tone.",
  ats: "Clean ATS-first structure with minimal decoration.",
  euro: "Formal CV style for European applications.",
  creative: "Polished accent layout for product, marketing, and design.",
  tech: "Project-forward format for data, engineering, and analytics."
};

const templates = ["modern", "classic", "compact", "executive", "ats", "euro", "creative", "tech"] as const;

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

export default function Home() {
  const [resume, setResume] = useState(initialResume);
  const [template, setTemplate] = useState<(typeof templates)[number]>("modern");
  const [builderView, setBuilderView] = useState<BuilderView>("resume");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

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

  useEffect(() => {
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
        skills: imported.skills || current.skills
      }));
      setImportMessage("CV imported. Review the fields, then enhance it.");
    } catch (importError) {
      setImportMessage(importError instanceof DOMException && importError.name === "AbortError" ? "CV import took too long. Please try a smaller PDF or upload a DOCX/TXT version." : "Could not upload this CV. Please try again or use DOCX/TXT.");
    } finally {
      setIsImporting(false);
    }
  }

  function printResume() {
    const previousTitle = document.title;
    document.title = resume.exportFileName || `${resume.name || "resume"}-${resume.versionLanguage || "cv"}`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 250);
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
          <button className="primaryButton" type="button" onClick={enhanceResume} disabled={isEnhancing}>
            {isEnhancing ? "Enhancing..." : "Enhance CV"}
          </button>
          <button className="iconButton" type="button" onClick={printResume} aria-label="Print or save as PDF">
            PDF
          </button>
        </div>

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
          <h2>Template</h2>
          <div className="templateGallery" role="group" aria-label="Choose resume template">
            {templates.map((option) => (
              <button
                className={`templateOption ${template === option ? "active" : ""}`}
                key={option}
                type="button"
                onClick={() => setTemplate(option)}
              >
                <strong>{templateLabels[option]}</strong>
                <small>{templateDescriptions[option]}</small>
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

          <section>
            <h3>Professional Summary</h3>
            <p>{resume.summary}</p>
          </section>

          <section>
            <h3>Experience</h3>
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

          <section>
            <h3>Core Skills</h3>
            <div className="skillList">
              {skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>

          {projects.length ? (
            <section>
              <h3>Selected Projects</h3>
              <ul>
                {projects.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {education.length ? (
            <section>
              <h3>Education</h3>
              <ul>
                {education.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {certifications.length ? (
            <section>
              <h3>Certifications</h3>
              <ul>
                {certifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
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
