import { NextResponse } from "next/server";
import { extractResponseText, getOpenAIKey } from "@/lib/ai";

type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

type AgentRequest = {
  action?: string;
  message: string;
  jobDescription: string;
  oldCv: string;
  version: {
    language: string;
    format: string;
    targetCountry: string;
    tone: string;
  };
  result?: unknown;
  history?: AgentMessage[];
};

function fallbackReply(payload: AgentRequest) {
  const action = payload.action || payload.message || "Improve CV";
  return {
    reply: `Safe improvement for "${action}": focus on verified experience, mirror the most important job keywords, and rewrite responsibilities into outcome-led bullets. Suggestions requiring confirmation: add metrics, language levels, certifications, or country-specific personal details only if they are true and you want to include them.`,
    applyText: "",
    missingInfo: ["Verified metrics", "Exact dates", "Language levels", "Role-specific tools you actually used"],
    safeImprovements: ["Use stronger action verbs", "Keep bullets concise", "Align skills with the job description"],
    needsConfirmation: ["Any quantified impact", "Any optional country-specific personal information"]
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AgentRequest;

  if (!payload.message?.trim() && !payload.action) {
    return NextResponse.json({ error: "Ask the AI Career Agent a question or choose a quick action." }, { status: 400 });
  }

  const openAIKey = getOpenAIKey();
  if (!openAIKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing.", ...fallbackReply(payload) }, { status: 503 });
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
            "You are an AI Career Agent for a premium resume builder. Help improve CVs step by step using the current CV, job description, selected language, CV format, target country, and generated result. Never hallucinate. Clearly separate safe improvements based on existing CV, suggestions requiring user confirmation, and missing information the user may add. Return concise, practical guidance."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI Career Agent failed. Please try again.", ...fallbackReply(payload) }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json({
    reply: extractResponseText(data) || fallbackReply(payload).reply,
    applyText: "",
    missingInfo: [],
    safeImprovements: [],
    needsConfirmation: []
  });
}
