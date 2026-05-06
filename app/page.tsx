"use client";

import { useMemo, useState } from "react";

type Template = "modern" | "classic" | "compact";

type ResumeState = {
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  links: string;
  summary: string;
  experienceTitle: string;
  experienceDates: string;
  experience: string;
  skills: string;
};

const initialResume: ResumeState = {
  name: "Abhishek Rahul",
  role: "Data Analyst",
  location: "Berlin, Germany",
  email: "abhishek@example.com",
  phone: "+49 152 0000 0000",
  links: "linkedin.com/in/abhishek | github.com/abhishek",
  summary:
    "I am a data analyst with experience in dashboards, SQL, Excel, Power BI, and business reporting. I like solving problems and finding insights.",
  experienceTitle: "Data Analytics Intern, Retail Insights Lab",
  experienceDates: "Jan 2025 - Dec 2025",
  experience: "built sales dashboard in Power BI\ncleaned customer data using SQL\nprepared weekly reports for management\nimproved reporting speed",
  skills: "SQL, Power BI, Excel, Python, Tableau, Data Cleaning, Dashboard Design, KPI Reporting"
};

const templateLabels: Record<Template, string> = {
  modern: "Modern CV",
  classic: "Classic CV",
  compact: "Compact CV"
};

function listFromText(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculateScore(resume: ResumeState) {
  let score = 45;
  score += resume.summary.length > 120 ? 12 : 4;
  score += listFromText(resume.experience).length >= 3 ? 14 : 6;
  score += listFromText(resume.skills).length >= 6 ? 11 : 5;
  score += resume.email && resume.phone ? 8 : 0;
  score += /\d|%|reduced|increased|improved|automated/i.test(resume.experience) ? 10 : 0;
  return Math.min(score, 98);
}

export default function Home() {
  const [resume, setResume] = useState(initialResume);
  const [template, setTemplate] = useState<Template>("modern");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const contact = [resume.location, resume.email, resume.phone, resume.links].filter(Boolean);
  const bullets = useMemo(() => listFromText(resume.experience), [resume.experience]);
  const skills = useMemo(() => listFromText(resume.skills), [resume.skills]);
  const score = calculateScore(resume);

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
          summary: resume.summary,
          experience: resume.experience
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import-cv", {
        method: "POST",
        body: formData
      });

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
    } finally {
      setIsImporting(false);
    }
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
          <button className="primaryButton" type="button" onClick={enhanceResume} disabled={isEnhancing}>
            {isEnhancing ? "Enhancing..." : "Enhance CV"}
          </button>
          <button className="iconButton" type="button" onClick={() => window.print()} aria-label="Print or save as PDF">
            PDF
          </button>
        </div>

        <section className="uploadPanel" aria-label="Import existing CV">
          <div>
            <h2>Import Existing CV</h2>
            <p>Upload a DOCX or TXT resume to fill the builder automatically.</p>
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

        <section className="controlGroup">
          <h2>Profile</h2>
          <Field label="Full name" value={resume.name} onChange={(value) => updateField("name", value)} />
          <Field label="Target role" value={resume.role} onChange={(value) => updateField("role", value)} />
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
          <h2>Template</h2>
          <div className="segmentedControl" role="group" aria-label="Choose resume template">
            {(["modern", "classic", "compact"] as Template[]).map((option) => (
              <button
                className={`templateOption ${template === option ? "active" : ""}`}
                key={option}
                type="button"
                onClick={() => setTemplate(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="previewStage" aria-label="Resume preview">
        <div className="previewTopbar">
          <div>
            <p className="eyebrow">Live preview</p>
            <h2>{templateLabels[template]}</h2>
          </div>
          <div className="scoreCard" aria-label="Resume strength score">
            <span>{score}</span>
            <small>ATS score</small>
          </div>
        </div>

        <article className={`resume ${template}`}>
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
        </article>
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
