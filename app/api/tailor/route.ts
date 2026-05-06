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

function fallbackTailor({ jobDescription, oldCv, version = defaultVersion }: TailorRequest): TailorResult {
  const jobWords = uniqueWords(jobDescription);
  const cvWords = new Set(uniqueWords(oldCv));
  const matched = jobWords.filter((word) => cvWords.has(word)).slice(0, 18);
  const missing = jobWords.filter((word) => !cvWords.has(word)).slice(0, 18);
  const isGerman = version.language === "German" || version.format === "German Lebenslauf";
  const bullets = oldCv
    .split(/\n|•|-/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18)
    .slice(0, 5)
    .map((line) =>
      isGerman
        ? `Optimierte Darstellung: ${line.replace(/\.$/, "")} mit klarerem Bezug zur Zielposition.`
        : `Strengthened ${line.replace(/\.$/, "")} with clearer business impact and job-relevant language.`
    );

  return {
    version,
    localizedHeadings: headingsFor(version),
    atsScore: Math.min(92, Math.max(35, Math.round((matched.length / Math.max(jobWords.length, 1)) * 100))),
    marketFitScore: version.targetCountry ? 72 : 58,
    professionalSummary: isGerman
      ? "Formales Profil mit Fokus auf relevante Erfahrung, nachweisbare Ergebnisse und passende Schlüsselbegriffe. Ergänzen Sie konkrete Kennzahlen nur, wenn diese belegbar sind."
      : "Candidate profile aligned to the target role with emphasis on relevant experience, measurable outcomes, and ATS-friendly keywords. Add specific metrics where you can verify them.",
    skills: {
      matched,
      missing,
      recommended: matched.concat(missing.slice(0, 6)).slice(0, 14)
    },
    experience: [
      {
        role: isGerman ? "Importierte Berufserfahrung" : "Imported CV experience",
        company: "",
        rewrittenBullets: bullets.length ? bullets : [isGerman ? "Formulieren Sie vorhandene Aufgaben als belegbare Erfolge." : "Rewrite existing responsibilities into concise, achievement-led bullets based on verified experience."]
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
        model: "gpt-4.1-nano",
        max_output_tokens: 1500,
        input: [
          {
            role: "system",
            content:
              "You are a world-class multilingual resume writer, ATS optimization expert, European CV specialist, German Lebenslauf expert, and career coach.\n\nYou must generate a CV tailored to:\n- Job description\n- Candidate's existing CV\n- Selected language\n- Selected CV format\n- Target country\n- Selected tone\n\nNever invent facts. Translate and localize professionally. Use correct CV conventions for the target country. For German CVs, use professional German business language. For European CVs, use clear formal European CV style. Keep ATS compatibility unless the user selects a creative format.\n\nReturn only valid JSON matching the required schema."
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
      return NextResponse.json({
        ...fallbackTailor({ ...payload, version }),
        warning: "AI generation failed, so a fast ATS analysis was generated. Please try again for a deeper AI rewrite."
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
