import { NextResponse } from "next/server";
import { extractResponseText, getOpenAIKey, parseJsonText } from "@/lib/ai";

type TailorRequest = {
  jobDescription: string;
  oldCv: string;
  mode?: string;
};

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

const emptyResult: TailorResult = {
  atsScore: 0,
  professionalSummary: "",
  skills: {
    matched: [],
    missing: [],
    recommended: []
  },
  experience: [],
  projects: [],
  educationSuggestions: [],
  certificationSuggestions: [],
  coverLetter: "",
  improvementTips: []
};

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

function fallbackTailor({ jobDescription, oldCv }: TailorRequest): TailorResult {
  const jobWords = uniqueWords(jobDescription);
  const cvWords = new Set(uniqueWords(oldCv));
  const matched = jobWords.filter((word) => cvWords.has(word)).slice(0, 18);
  const missing = jobWords.filter((word) => !cvWords.has(word)).slice(0, 18);
  const bullets = oldCv
    .split(/\n|•|-/)
    .map((line) => line.trim())
    .filter((line) => line.length > 18)
    .slice(0, 5)
    .map((line) => `Strengthened ${line.replace(/\.$/, "")} with clearer business impact and job-relevant language.`);

  return {
    ...emptyResult,
    atsScore: Math.min(92, Math.max(35, Math.round((matched.length / Math.max(jobWords.length, 1)) * 100))),
    professionalSummary:
      "Candidate profile aligned to the target role with emphasis on relevant experience, measurable outcomes, and ATS-friendly keywords. Add specific metrics where you can verify them.",
    skills: {
      matched,
      missing,
      recommended: matched.concat(missing.slice(0, 6)).slice(0, 14)
    },
    experience: [
      {
        role: "Imported CV experience",
        company: "Existing employer",
        rewrittenBullets: bullets.length ? bullets : ["Rewrite existing responsibilities into concise, achievement-led bullets based on verified experience."]
      }
    ],
    projects: ["Add one relevant project that proves the target job skills, using only work you actually completed."],
    certificationSuggestions: missing.slice(0, 3).map((keyword) => `Consider a certification or course related to ${keyword} if it is relevant to your goals.`),
    coverLetter:
      "Dear Hiring Manager,\n\nI am excited to apply for this role. My background aligns with the position through relevant experience, transferable skills, and a strong focus on measurable outcomes. I would welcome the opportunity to discuss how I can contribute to your team.\n\nSincerely,"
  };
}

function normalizeResult(value: Partial<TailorResult>): TailorResult {
  return {
    atsScore: Math.max(0, Math.min(100, Number(value.atsScore || 0))),
    professionalSummary: value.professionalSummary || "",
    skills: {
      matched: Array.isArray(value.skills?.matched) ? value.skills.matched : [],
      missing: Array.isArray(value.skills?.missing) ? value.skills.missing : [],
      recommended: Array.isArray(value.skills?.recommended) ? value.skills.recommended : []
    },
    experience: Array.isArray(value.experience)
      ? value.experience.map((item) => ({
          role: item.role || "",
          company: item.company || "",
          rewrittenBullets: Array.isArray(item.rewrittenBullets) ? item.rewrittenBullets : []
        }))
      : [],
    projects: Array.isArray(value.projects) ? value.projects : [],
    educationSuggestions: Array.isArray(value.educationSuggestions) ? value.educationSuggestions : [],
    certificationSuggestions: Array.isArray(value.certificationSuggestions) ? value.certificationSuggestions : [],
    coverLetter: value.coverLetter || "",
    improvementTips: Array.isArray(value.improvementTips) ? value.improvementTips : []
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as TailorRequest;
  const jobDescription = payload.jobDescription?.trim() || "";
  const oldCv = payload.oldCv?.trim() || "";

  if (jobDescription.length < 80 || oldCv.length < 80) {
    return NextResponse.json({ error: "Please add a meaningful job description and old CV before generating." }, { status: 400 });
  }

  const openAIKey = getOpenAIKey();
  if (!openAIKey) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY is missing. Add it in .env.local locally and in Vercel environment variables for production.",
        fallback: fallbackTailor(payload)
      },
      { status: 503 }
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are a world-class resume writer, ATS optimization expert, and career coach. Given the job description and the candidate's old CV, create a highly professional, ATS-friendly resume tailored to the job. Do not fabricate facts. Rewrite weak bullet points into strong achievement-based bullets. Add job-relevant keywords naturally. Identify missing keywords separately. Return only valid JSON."
        },
        {
          role: "user",
          content: JSON.stringify({
            requiredJsonShape: {
              atsScore: "number 0-100",
              professionalSummary: "string",
              skills: {
                matched: ["string"],
                missing: ["string"],
                recommended: ["string"]
              },
              experience: [
                {
                  role: "string from candidate CV, blank if unclear",
                  company: "string from candidate CV, blank if unclear",
                  rewrittenBullets: ["string"]
                }
              ],
              projects: ["suggested project descriptions based only on existing CV evidence or clearly marked suggestions"],
              educationSuggestions: ["string"],
              certificationSuggestions: ["string"],
              coverLetter: "string",
              improvementTips: ["string"]
            },
            mode: payload.mode || "ATS-friendly",
            jobDescription,
            oldCv
          })
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI tailoring failed. Please try again.", fallback: fallbackTailor(payload) }, { status: 502 });
  }

  const data = await response.json();
  const content = extractResponseText(data);

  try {
    return NextResponse.json(normalizeResult(parseJsonText(content || "")));
  } catch {
    return NextResponse.json({ error: "AI response could not be parsed. Please try again.", fallback: fallbackTailor(payload) }, { status: 502 });
  }
}
