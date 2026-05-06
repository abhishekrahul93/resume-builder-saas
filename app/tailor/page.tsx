"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { appliedResumeStorageKey, type ResumeState } from "@/lib/resume";

type TailoredExperience = {
  role: string;
  company: string;
  rewrittenBullets: string[];
};

type TailorResult = {
  atsScore: number;
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
  coverLetter: string;
  improvementTips: string[];
};

const enhancerModes = ["ATS-friendly", "More concise", "More executive", "Stronger bullets", "Keyword optimized"];

function joinList(items: string[]) {
  return items.filter(Boolean).join(", ");
}

function joinBullets(items: string[]) {
  return items.filter(Boolean).join("\n");
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Strong match";
  if (score >= 55) return "Needs tuning";
  return "Low match";
}

export default function TailorPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [oldCv, setOldCv] = useState("");
  const [mode, setMode] = useState(enhancerModes[0]);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const allBullets = useMemo(() => result?.experience.flatMap((item) => item.rewrittenBullets) || [], [result]);

  async function importCv(file: File | undefined) {
    if (!file) return;
    setIsImporting(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-cv", { method: "POST", body: formData });
      const imported = await response.json();

      if (!response.ok) {
        setError(imported.error || "Could not import this CV.");
        return;
      }

      setOldCv(imported.rawText || [imported.summary, imported.experience, imported.skills].filter(Boolean).join("\n\n"));
      setNotice("CV imported. Paste the job description and generate a tailored version.");
    } finally {
      setIsImporting(false);
    }
  }

  async function generateTailoredCv(selectedMode = mode) {
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
    setIsGenerating(true);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, oldCv, mode: selectedMode })
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.fallback) {
          setResult(data.fallback);
        }
        setError(data.error || "Could not generate tailored CV content.");
        return;
      }

      setResult(data);
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

    applyDraft({
      targetJob: jobDescription,
      summary: result.professionalSummary,
      skills: joinList(result.skills.recommended.length ? result.skills.recommended : result.skills.matched),
      experience: joinBullets(allBullets),
      projects: joinBullets(result.projects),
      certifications: joinBullets(result.certificationSuggestions)
    });
  }

  return (
    <main className="tailorShell">
      <section className="tailorHero">
        <nav className="tailorNav">
          <Link href="/" className="brandLink">
            <span className="brandMark">CF</span>
            CareerForge
          </Link>
          <Link href="/" className="secondaryButton">
            Resume Builder
          </Link>
        </nav>
        <div className="tailorHeroGrid">
          <div>
            <p className="eyebrow">AI CV Tailor & Enhancer</p>
            <h1>Tailor your CV to any job in seconds</h1>
            <p>
              Paste a job description and your old CV. Our AI creates an ATS-optimized, recruiter-ready resume.
            </p>
          </div>
          <div className="tailorHeroCard">
            <span>{result ? result.atsScore : "--"}</span>
            <small>{result ? scoreLabel(result.atsScore) : "ATS match score"}</small>
          </div>
        </div>
      </section>

      <section className="tailorWorkspace">
        <div className="tailorInputs">
          <div className="tailorCard">
            <div className="cardHeader">
              <div>
                <p className="eyebrow">Step 1</p>
                <h2>Job Description</h2>
              </div>
              <span className="countBadge">{jobDescription.trim().length} chars</span>
            </div>
            <textarea
              className="largeTextarea"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job description here, including responsibilities, required skills, tools, and qualifications."
              rows={12}
            />
          </div>

          <div className="tailorCard">
            <div className="cardHeader">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2>Old CV</h2>
              </div>
              <label className="miniUpload">
                {isImporting ? "Importing..." : "Upload CV"}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  disabled={isImporting}
                  onChange={(event) => {
                    void importCv(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <textarea
              className="largeTextarea"
              value={oldCv}
              onChange={(event) => setOldCv(event.target.value)}
              placeholder="Paste your existing CV here, or upload a PDF, DOCX, or TXT file."
              rows={12}
            />
          </div>
        </div>

        <div className="actionDeck">
          <div className="modeGrid">
            {enhancerModes.map((item) => (
              <button className={`modeButton ${mode === item ? "active" : ""}`} key={item} type="button" onClick={() => setMode(item)}>
                {item}
              </button>
            ))}
          </div>
          <button className="generateButton" type="button" onClick={() => void generateTailoredCv()} disabled={isGenerating}>
            {isGenerating ? "Generating tailored CV..." : "Generate Tailored CV"}
          </button>
          <div className="quickImprove">
            {enhancerModes.slice(1).map((item) => (
              <button key={item} type="button" onClick={() => void generateTailoredCv(item)} disabled={isGenerating}>
                {item}
              </button>
            ))}
          </div>
          {error ? <p className="errorBox">{error}</p> : null}
          {notice ? <p className="noticeBox">{notice}</p> : null}
        </div>

        {!result ? (
          <div className="emptyState">
            <h2>Your tailored CV analysis will appear here</h2>
            <p>Generate once to see ATS scoring, keyword gaps, rewritten bullets, project ideas, and a cover letter draft.</p>
          </div>
        ) : (
          <section className="resultsGrid" aria-label="Tailored CV results">
            <div className="scoreModule">
              <div className="scoreRing" style={{ "--score": `${result.atsScore}%` } as CSSProperties}>
                <span>{result.atsScore}</span>
              </div>
              <div>
                <p className="eyebrow">ATS score</p>
                <h2>{scoreLabel(result.atsScore)}</h2>
                <p>Score is based on CV and job-description keyword overlap plus role alignment. Review missing terms before applying.</p>
              </div>
              <button className="primaryButton" type="button" onClick={applyAll}>
                Apply Full Tailored CV
              </button>
            </div>

            <ResultCard title="Professional Summary" actionLabel="Apply Summary" onApply={() => applyDraft({ summary: result.professionalSummary })}>
              <p>{result.professionalSummary}</p>
            </ResultCard>

            <ResultCard title="Keyword Analysis">
              <KeywordBlock title="Matched" items={result.skills.matched} tone="matched" />
              <KeywordBlock title="Missing" items={result.skills.missing} tone="missing" />
              <KeywordBlock title="Recommended Skills" items={result.skills.recommended} tone="recommended" />
              <button className="secondaryButton" type="button" onClick={() => applyDraft({ skills: joinList(result.skills.recommended) })}>
                Apply Skills
              </button>
            </ResultCard>

            <ResultCard title="Rewritten Work Experience" actionLabel="Apply Bullets" onApply={() => applyDraft({ experience: joinBullets(allBullets) })}>
              {result.experience.map((item, index) => (
                <div className="experienceResult" key={`${item.role}-${index}`}>
                  <strong>{[item.role, item.company].filter(Boolean).join(" - ") || "Experience"}</strong>
                  <ul>
                    {item.rewrittenBullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </ResultCard>

            <ResultCard title="Suggested Projects" actionLabel="Apply Projects" onApply={() => applyDraft({ projects: joinBullets(result.projects) })}>
              <ul>
                {result.projects.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ResultCard>

            <ResultCard
              title="Education & Certifications"
              actionLabel="Apply Certifications"
              onApply={() => applyDraft({ certifications: joinBullets(result.certificationSuggestions) })}
            >
              <KeywordBlock title="Education Suggestions" items={result.educationSuggestions} tone="recommended" />
              <KeywordBlock title="Certification Suggestions" items={result.certificationSuggestions} tone="recommended" />
            </ResultCard>

            <ResultCard title="Cover Letter Draft">
              <pre className="coverLetter">{result.coverLetter}</pre>
            </ResultCard>

            <ResultCard title="Improvement Tips">
              <ul>
                {result.improvementTips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ResultCard>

            <div className="comparisonPanel">
              <div>
                <p className="eyebrow">Original</p>
                <p>{oldCv.slice(0, 900)}{oldCv.length > 900 ? "..." : ""}</p>
              </div>
              <div>
                <p className="eyebrow">Enhanced</p>
                <p>{result.professionalSummary}</p>
                <ul>
                  {allBullets.slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function ResultCard({
  title,
  actionLabel,
  onApply,
  children
}: {
  title: string;
  actionLabel?: string;
  onApply?: () => void;
  children: ReactNode;
}) {
  return (
    <article className="resultCard">
      <div className="cardHeader">
        <h2>{title}</h2>
        {actionLabel && onApply ? (
          <button className="secondaryButton" type="button" onClick={onApply}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </article>
  );
}

function KeywordBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="keywordBlock">
      <h3>{title}</h3>
      <div className="keywordList">
        {items.length ? items.map((item) => <span className={tone} key={item}>{item}</span>) : <small>No items yet</small>}
      </div>
    </div>
  );
}
