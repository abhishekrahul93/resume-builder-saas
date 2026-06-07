import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getRevenuePulseSnapshot, type InsightReport } from "@/lib/revenuepulse";

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

  return JSON.parse(cleaned) as Omit<InsightReport, "source">;
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

function normalizeReport(parsed: Partial<Omit<InsightReport, "source">>, fallback: InsightReport): InsightReport {
  const findings = toList(parsed.findings).slice(0, 8);
  const decisions = toList(parsed.decisions).slice(0, 6);
  const risks = toList(parsed.risks).slice(0, 5);

  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : fallback.title,
    generatedAt: typeof parsed.generatedAt === "string" && parsed.generatedAt.trim() ? parsed.generatedAt : fallback.generatedAt,
    executiveSummary: typeof parsed.executiveSummary === "string" && parsed.executiveSummary.trim() ? parsed.executiveSummary : fallback.executiveSummary,
    findings: findings.length ? findings : fallback.findings,
    decisions: decisions.length ? decisions : fallback.decisions,
    risks: risks.length ? risks : fallback.risks,
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

export async function POST() {
  const snapshot = getRevenuePulseSnapshot();
  const openAIKey = getOpenAIKey();

  if (!openAIKey) {
    return NextResponse.json(snapshot.insightReport);
  }

  const groundedPayload = {
    companyContext: snapshot.companyContext,
    kpis: snapshot.kpis.map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
      change: Number(kpi.change.toFixed(2)),
      status: kpi.status,
      definition: kpi.definition
    })),
    anomalies: snapshot.anomalies,
    dataQuality: snapshot.dataQuality,
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
            "You are a senior analytics manager writing a concise stakeholder report. Use only the supplied RevenuePulse metrics, anomaly notes, and data-quality checks. Return strict JSON with title, generatedAt, executiveSummary, findings, decisions, and risks. findings, decisions, and risks must each be a short string array, not nested objects. Do not invent numbers, company names, or causes."
        },
        {
          role: "user",
          content: JSON.stringify(groundedPayload)
        }
      ]
    })
  });

  if (!response.ok) {
    return NextResponse.json(snapshot.insightReport);
  }

  try {
    const data = await response.json();
    const parsed = parseJsonText(extractResponseText(data));
    return NextResponse.json(normalizeReport(parsed, snapshot.insightReport));
  } catch {
    return NextResponse.json(snapshot.insightReport);
  }
}
