import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  getRevenuePulseCopilotResponse,
  getRevenuePulseSnapshot,
  type CopilotEvaluation,
  type CopilotResponse
} from "@/lib/revenuepulse";

type CopilotRequest = {
  question?: string;
};

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

  return data.output?.flatMap((item) => item.content || []).find((content) => content.text)?.text || "";
}

function parseJsonText(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned) as Partial<CopilotResponse>;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toList(item));
  }

  if (typeof value === "string") {
    return [value];
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      toList(item).map((detail) => `${key}: ${detail}`)
    );
  }

  return [];
}

function clampScore(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeEvaluation(value: Partial<CopilotEvaluation> | undefined, fallback: CopilotEvaluation): CopilotEvaluation {
  return {
    groundedness: clampScore(value?.groundedness, fallback.groundedness),
    completeness: clampScore(value?.completeness, fallback.completeness),
    actionability: clampScore(value?.actionability, fallback.actionability),
    hallucinationRisk: value?.hallucinationRisk === "Medium" || value?.hallucinationRisk === "High" ? value.hallucinationRisk : fallback.hallucinationRisk,
    checks: toList(value?.checks).slice(0, 4).length ? toList(value?.checks).slice(0, 4) : fallback.checks
  };
}

function normalizeCopilotResponse(parsed: Partial<CopilotResponse>, fallback: CopilotResponse): CopilotResponse {
  return {
    question: typeof parsed.question === "string" && parsed.question.trim() ? parsed.question : fallback.question,
    answer: typeof parsed.answer === "string" && parsed.answer.trim() ? parsed.answer : fallback.answer,
    nextActions: toList(parsed.nextActions).slice(0, 4).length ? toList(parsed.nextActions).slice(0, 4) : fallback.nextActions,
    caveats: toList(parsed.caveats).slice(0, 3).length ? toList(parsed.caveats).slice(0, 3) : fallback.caveats,
    sources: fallback.sources,
    evaluation: normalizeEvaluation(parsed.evaluation, fallback.evaluation),
    source: "openai"
  };
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
  const payload = (await request.json().catch(() => ({}))) as CopilotRequest;
  const question = payload.question?.trim() || "What should the CEO do this week?";
  const fallback = getRevenuePulseCopilotResponse(question);
  const openAIKey = getOpenAIKey();

  if (!openAIKey) {
    return NextResponse.json(fallback);
  }

  const snapshot = getRevenuePulseSnapshot();
  const groundedPayload = {
    question,
    fallbackAnswer: fallback.answer,
    allowedSources: fallback.sources,
    kpis: snapshot.kpis.map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
      change: Number(kpi.change.toFixed(2)),
      status: kpi.status,
      definition: kpi.definition
    })),
    anomalies: snapshot.anomalies,
    dataQuality: snapshot.dataQuality,
    metricDefinitions: snapshot.metricDefinitions,
    segments: snapshot.segments,
    channels: snapshot.channels
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are RevenuePulse Copilot, a production-style analytics copilot. Answer only from the supplied JSON. Return strict JSON with question, answer, nextActions, caveats, and evaluation. Do not invent metrics, dates, customers, companies, or causes. nextActions and caveats must be short string arrays. evaluation must include groundedness, completeness, actionability, hallucinationRisk, and checks."
        },
        {
          role: "user",
          content: JSON.stringify(groundedPayload)
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json(fallback);
  }

  try {
    const data = await response.json();
    return NextResponse.json(normalizeCopilotResponse(parseJsonText(extractResponseText(data)), fallback));
  } catch {
    return NextResponse.json(fallback);
  }
}
