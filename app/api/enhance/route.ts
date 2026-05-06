import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type EnhanceRequest = {
  role: string;
  summary: string;
  experience: string;
};

type EnhancedResume = {
  summary: string;
  bullets: string[];
};

const fallbackVerbs = ["Delivered", "Built", "Analyzed", "Automated", "Improved"];
const weakStarts: Record<string, string> = {
  built: "Built",
  build: "Built",
  cleaned: "Cleaned and standardized",
  clean: "Cleaned and standardized",
  prepared: "Prepared",
  improved: "Improved",
  created: "Created",
  made: "Created",
  analyzed: "Analyzed"
};

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function localEnhance({ role, summary, experience }: EnhanceRequest): EnhancedResume {
  const bullets = experience
    .split(/\n|,/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .map((item, index) => {
      const [firstWord, ...rest] = item.split(/\s+/);
      const normalizedVerb = weakStarts[firstWord.toLowerCase()];
      const base = normalizedVerb ? `${normalizedVerb} ${rest.join(" ")}` : sentenceCase(item);
      const startsWithVerb = fallbackVerbs.some((verb) => base.toLowerCase().startsWith(verb.toLowerCase()));
      const verb = startsWithVerb || normalizedVerb ? "" : `${fallbackVerbs[index % fallbackVerbs.length]} `;
      const metric = /\d|%|faster|reduced|increased|improved|automated/i.test(item)
        ? ""
        : " to improve reporting quality and decision speed";
      return `${verb}${base}${metric}.`.replace(/\.+$/, ".");
    });

  return {
    summary:
      summary.trim().length > 80
        ? summary.trim()
        : `${role || "Professional"} with strong analytical judgment, clear communication, and a track record of turning raw career details into concise, achievement-led resume stories.`,
    bullets
  };
}

function extractResponseText(data: {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}) {
  if (data.output_text) {
    return data.output_text;
  }

  return data.output?.flatMap((item) => item.content || []).find((content) => content.text)?.text;
}

function parseJsonText(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned);
}

function getOpenAIKey() {
  if (process.env.NODE_ENV === "production") {
    return process.env.OPENAI_API_KEY || "";
  }

  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((item) => item.startsWith("OPENAI_API_KEY="));

    const localKey = line?.replace("OPENAI_API_KEY=", "").trim();
    if (localKey) {
      return localKey;
    }
  }

  return process.env.OPENAI_API_KEY || "";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as EnhanceRequest;
  const openAIKey = getOpenAIKey();

  if (!openAIKey) {
    return NextResponse.json(localEnhance(payload));
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
            "You are an expert resume writer for a premium CV builder. Return only strict JSON with keys summary and bullets. Make copy ATS-friendly, job-targeted, concise, achievement-led, and honest. Use strong action verbs. Do not invent employers, degrees, certifications, or exact metrics."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json(localEnhance(payload));
  }

  const data = await response.json();
  const content = extractResponseText(data);

  try {
    return NextResponse.json(parseJsonText(content || ""));
  } catch {
    return NextResponse.json(localEnhance(payload));
  }
}
