import { NextResponse } from "next/server";
import { extractResponseText, getOpenAIKey, parseJsonText } from "@/lib/ai";

type CvVersion = {
  language: string;
  format: string;
  targetCountry: string;
  tone: string;
};

type TailorRequest = {
  jobDescription: string;
  oldCv: string;
  mode?: string;
  version?: CvVersion;
};

type TailoredExperience = {
  role: string;
  company: string;
  rewrittenBullets: string[];
};

export type TailorResult = {
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

const defaultVersion: CvVersion = {
  language: "English",
  format: "Global ATS Resume",
  targetCountry: "United States",
  tone: "Professional"
};

const englishHeadings = {
  summary: "Professional Summary",
  skills: "Skills",
  experience: "Work Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages"
};

const germanHeadings = {
  summary: "Profil",
  skills: "Fähigkeiten",
  experience: "Berufserfahrung",
  education: "Ausbildung",
  projects: "Projekte",
  certifications: "Zertifizierungen",
  languages: "Sprachen"
};

function headingsFor(version: CvVersion) {
  return version.language === "German" || version.format === "German Lebenslauf" ? germanHeadings : englishHeadings;
}

function uniqueWords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3)
    )
  );
}

const knownSkillPatterns = [
  "SQL",
  "Power BI",
  "Tableau",
  "Python",
  "pandas",
  "NumPy",
  "scipy",
  "matplotlib",
  "R",
  "Excel",
  "Google Analytics",
  "Looker Studio",
  "LookML",
  "dbt",
  "Airflow",
  "AWS",
  "Athena",
  "Glue",
  "S3",
  "ETL",
  "Data Warehousing",
  "Data Visualization",
  "Dashboard Development",
  "A/B Testing",
  "Hypothesis Testing",
  "Regression Analysis",
  "Product Analytics",
  "Cohort Analysis",
  "Data Governance",
  "Stakeholder Communication",
  "Trino",
  "JSON",
  "Window Functions",
  "CTEs"
];

const fallbackStopWords = new Set(["arden", "berlin", "germany", "required", "from", "team", "university", "analyst", "data", "work", "with", "your", "their", "eligible"]);

function cleanLines(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function sectionBetween(lines: string[], starts: string[], stops: string[]) {
  const startIndex = lines.findIndex((line) => starts.some((start) => line.toLowerCase().includes(start)));
  if (startIndex === -1) return "";
  const rest = lines.slice(startIndex + 1);
  const stopIndex = rest.findIndex((line) => stops.some((stop) => line.toLowerCase().includes(stop)));
  return (stopIndex === -1 ? rest : rest.slice(0, stopIndex)).join("\n");
}

function skillRegex(skill: string) {
  return new RegExp(`(^|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase()}([^a-z0-9]|$)`);
}

function extractKnownSkills(text: string) {
  const normalized = text.toLowerCase();
  return knownSkillPatterns.filter((skill) => skillRegex(skill).test(normalized));
}

function extractSummary(oldCv: string) {
  const lines = cleanLines(oldCv);
  return sectionBetween(lines, ["professional summary", "summary", "profile", "profil"], ["professional experience", "work experience", "experience", "berufserfahrung", "technical skills", "skills"]).replace(/\n/g, " ").trim();
}

function extractExperienceBullets(oldCv: string) {
  const lines = cleanLines(oldCv);
  const experienceText =
    sectionBetween(lines, ["professional experience", "work experience", "experience", "berufserfahrung"], ["portfolio projects", "projects", "technical skills", "skills", "education", "certifications", "languages"]) ||
    lines.join("\n");

  return cleanLines(experienceText)
    .filter((line) => line.length > 35)
    .filter((line) => !/@|linkedin|github|eligible|professional summary|technical skills|education|certifications|languages/i.test(line))
    .filter((line) => !/^\d{4}\s*[–-]\s*\d{4}|^mar\s+\d{4}|^jul\s+\d{4}/i.test(line))
    .map((line) => line.replace(/^[•\-*]\s*/, "").replace(/\.$/, ""))
    .slice(0, 7);
}

function fallbackTailor({ jobDescription, oldCv, version = defaultVersion }: TailorRequest): TailorResult {
  const cvSkills = extractKnownSkills(oldCv);
  const jobSkills = extractKnownSkills(jobDescription);
  const matched = cvSkills.filter((skill) => jobSkills.includes(skill)).slice(0, 18);
  const missing = jobSkills.filter((skill) => !cvSkills.includes(skill)).slice(0, 18);
  const recommended = Array.from(new Set([...cvSkills, ...matched, ...missing.slice(0, 4)])).slice(0, 16);
  const jobWords = uniqueWords(jobDescription).filter((word) => !fallbackStopWords.has(word));
  const isGerman = version.language === "German" || version.format === "German Lebenslauf";
  const rawBullets = oldCv
    .split(/\n|•|-/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18)
    .slice(0, 5)
    .map((line) =>
      isGerman
        ? `Optimierte Darstellung: ${line.replace(/\.$/, "")} mit klarerem Bezug zur Zielposition.`
        : `Strengthened ${line.replace(/\.$/, "")} with clearer business impact and job-relevant language.`
    );
  const bullets = extractExperienceBullets(oldCv);
  const summary = extractSummary(oldCv);

  return {
    version,
    localizedHeadings: headingsFor(version),
    atsScore: Math.min(92, Math.max(45, Math.round((matched.length / Math.max(jobSkills.length || jobWords.length, 1)) * 100))),
    marketFitScore: version.targetCountry ? 72 : 58,
    professionalSummary: summary || (isGerman
      ? "Formales Profil mit Fokus auf relevante Erfahrung, nachweisbare Ergebnisse und passende Schlüsselbegriffe. Ergänzen Sie konkrete Kennzahlen nur, wenn diese belegbar sind."
      : "Candidate profile aligned to the target role with emphasis on relevant experience, measurable outcomes, and ATS-friendly keywords. Add specific metrics where you can verify them."),
    skills: {
      matched: matched.length ? matched : cvSkills.slice(0, 12),
      missing,
      recommended
    },
    experience: [
      {
        role: isGerman ? "Berufserfahrung" : "Professional Experience",
        company: "",
        rewrittenBullets: bullets.length ? bullets : rawBullets.length ? rawBullets : [isGerman ? "Formulieren Sie vorhandene Aufgaben als belegbare Erfolge." : "Rewrite existing responsibilities into concise, achievement-led bullets based on verified experience."]
      }
    ],
    projects: [isGerman ? "Fügen Sie ein relevantes Projekt hinzu, das vorhandene Erfahrung für die Zielrolle belegt." : "Add one relevant project that proves the target job skills, using only work you actually completed."],
    educationSuggestions: [],
    certificationSuggestions: missing.slice(0, 3).map((keyword) => isGerman ? `Optional: Weiterbildung zu ${keyword}, falls relevant.` : `Consider a certification or course related to ${keyword} if relevant.`),
    languageSuggestions: isGerman ? ["Sprachniveaus nach CEFR angeben, z. B. Deutsch B2, Englisch C1."] : ["Add language proficiency levels if relevant to the target market."],
    countrySpecificTips: isGerman
      ? ["Foto, Geburtsdatum und Nationalität sind in Deutschland kulturell optional. Nicht hinzufügen, wenn Sie diese Angaben nicht teilen möchten."]
      : ["Keep formatting simple, ATS-readable, and targeted to the country convention."],
    coverLetter: isGerman
      ? "Sehr geehrte Damen und Herren,\n\nmit großem Interesse bewerbe ich mich auf die ausgeschriebene Position. Meine bisherige Erfahrung passt gut zu den Anforderungen der Rolle, insbesondere durch relevante Fähigkeiten, strukturierte Arbeitsweise und nachweisbare Ergebnisse.\n\nMit freundlichen Grüßen"
      : "Dear Hiring Manager,\n\nI am excited to apply for this role. My background aligns with the position through relevant experience, transferable skills, and a strong focus on measurable outcomes.\n\nSincerely,",
    improvementTips: isGerman ? ["Kennzahlen ergänzen, sofern belegbar.", "Relevante Begriffe aus der Stellenanzeige natürlich einbauen."] : ["Add verified metrics where possible.", "Mirror important job-description keywords naturally."],
    agentSuggestions: isGerman ? ["Lebenslauf formeller machen", "Berufserfahrung kürzen", "Deutschland-Fit prüfen"] : ["Improve summary", "Rewrite bullets", "Boost ATS score"]
  };
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.floor(maxLength * 0.72))}\n\n[Middle content shortened for fast analysis]\n\n${value.slice(-Math.floor(maxLength * 0.28))}`;
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeResult(value: Partial<TailorResult>, version: CvVersion): TailorResult {
  return {
    version: value.version || version,
    localizedHeadings: value.localizedHeadings || headingsFor(version),
    atsScore: Math.max(0, Math.min(100, Number(value.atsScore || 0))),
    marketFitScore: Math.max(0, Math.min(100, Number(value.marketFitScore || 0))),
    professionalSummary: value.professionalSummary || "",
    skills: {
      matched: asStrings(value.skills?.matched),
      missing: asStrings(value.skills?.missing),
      recommended: asStrings(value.skills?.recommended)
    },
    experience: Array.isArray(value.experience)
      ? value.experience.map((item) => ({
          role: item.role || "",
          company: item.company || "",
          rewrittenBullets: asStrings(item.rewrittenBullets)
        }))
      : [],
    projects: asStrings(value.projects),
    educationSuggestions: asStrings(value.educationSuggestions),
    certificationSuggestions: asStrings(value.certificationSuggestions),
    languageSuggestions: asStrings(value.languageSuggestions),
    countrySpecificTips: asStrings(value.countrySpecificTips),
    coverLetter: value.coverLetter || "",
    improvementTips: asStrings(value.improvementTips),
    agentSuggestions: asStrings(value.agentSuggestions)
  };
}

export async function POST(request: Request) {
  let payload: TailorRequest;

  try {
    payload = (await request.json()) as TailorRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request. Please refresh and try again." }, { status: 400 });
  }

  const jobDescription = payload.jobDescription?.trim() || "";
  const oldCv = payload.oldCv?.trim() || "";
  const version = { ...defaultVersion, ...(payload.version || {}) };

  if (jobDescription.length < 80 || oldCv.length < 80) {
    return NextResponse.json({ error: "Please add a meaningful job description and old CV before generating." }, { status: 400 });
  }

  try {
    const openAIKey = getOpenAIKey();
    if (!openAIKey) {
      return NextResponse.json({
        ...fallbackTailor({ ...payload, version }),
        warning: "OPENAI_API_KEY is missing. A fast ATS analysis was generated instead."
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_output_tokens: 3200,
        input: [
          {
            role: "system",
            content:
              "You are a world-class multilingual resume writer, ATS optimization expert, European CV specialist, German Lebenslauf expert, and career coach.\n\nYou must generate a CV tailored to:\n- Job description\n- Candidate's existing CV\n- Selected language\n- Selected CV format\n- Target country\n- Selected tone\n\nNever invent facts. Translate and localize professionally. Use correct CV conventions for the target country. For German CVs, use professional German business language. For European CVs, use clear formal European CV style. Keep ATS compatibility unless the user selects a creative format.\n\nReturn raw valid JSON only. Do not use markdown fences. Do not add commentary outside JSON."
          },
          {
            role: "user",
            content: JSON.stringify({
              requiredJsonShape: {
                version,
                localizedHeadings: {
                  summary: "string",
                  skills: "string",
                  experience: "string",
                  education: "string",
                  projects: "string",
                  certifications: "string",
                  languages: "string"
                },
                atsScore: "number",
                marketFitScore: "number",
                professionalSummary: "string",
                skills: { matched: ["string"], missing: ["string"], recommended: ["string"] },
                experience: [{ role: "string", company: "string", rewrittenBullets: ["string"] }],
                projects: ["string"],
                educationSuggestions: ["string"],
                certificationSuggestions: ["string"],
                languageSuggestions: ["string"],
                countrySpecificTips: ["string"],
                coverLetter: "string",
                improvementTips: ["string"],
                agentSuggestions: ["string"]
              },
              mode: payload.mode || "ATS-friendly",
              version,
              jobDescription: limitText(jobDescription, 6500),
              oldCv: limitText(oldCv, 8500),
              constraints: [
                "Do not invent fake companies, degrees, dates, or experience.",
                "If information is missing, place it in suggestions, not in the CV content.",
                "For German CVs use headings Profil, Berufserfahrung, Ausbildung, Fähigkeiten, Projekte, Zertifizierungen, Sprachen.",
                "Mention photo, date of birth, and nationality only as optional German cultural suggestions."
              ]
            })
          }
        ]
      })
    }).catch((error) => {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      throw error;
    });

    clearTimeout(timeout);

    if (!response) {
      return NextResponse.json({
        ...fallbackTailor({ ...payload, version }),
        warning: "AI generation took too long, so a fast ATS analysis was generated. Try again for a deeper AI rewrite."
      });
    }

    if (!response.ok) {
      const authWarning =
        response.status === 401
          ? "OpenAI rejected the API key in Vercel. Replace OPENAI_API_KEY in Vercel Environment Variables, then redeploy."
          : `AI generation failed with OpenAI status ${response.status}.`;
      return NextResponse.json({
        ...fallbackTailor({ ...payload, version }),
        warning: `${authWarning} A fast ATS analysis was generated instead.`
      });
    }

    const data = await response.json();
    const content = extractResponseText(data);

    try {
      return NextResponse.json(normalizeResult(parseJsonText(content || ""), version));
    } catch {
      return NextResponse.json({
        ...fallbackTailor({ ...payload, version }),
        warning: "AI response could not be parsed, so a fast ATS analysis was generated. Please try again for a deeper AI rewrite."
      });
    }
  } catch {
    return NextResponse.json({
      ...fallbackTailor({ ...payload, version }),
      warning: "Generation failed safely, so a fast ATS analysis was generated. Please try again for a deeper AI rewrite."
    });
  }
}
