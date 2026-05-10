import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string }>;

type RiskLevel = "High" | "Medium" | "Low";

type ContractRisk = {
  title: string;
  level: RiskLevel;
  clause: string;
  whyItMatters: string;
  suggestedEdit: string;
};

type ContractAnalysis = {
  riskScore: number;
  verdict: string;
  contractType: string;
  counterparty: string;
  keyConcerns: string[];
  indiaSpecificFlags: ContractRisk[];
  risks: ContractRisk[];
  missingProtections: string[];
  negotiationEmail: string;
  pilotSummary: string;
  source: "gemini" | "demo-engine";
};

type ReviewPerspective = "vendor" | "client";

const fallbackContract = `Vendor Services Agreement

The Client shall pay the Vendor within 90 days from receipt of invoice. Any disputes shall be subject to arbitration in Singapore. The Vendor shall indemnify the Client for all losses, claims, penalties, indirect damages, and consequential losses arising from the services. Either party may terminate this agreement with 5 days written notice. The Vendor shall maintain confidentiality. Cheque payments may be accepted at Client discretion. GST will be paid as applicable.`;

function clampScore(score: number) {
  return Math.max(1, Math.min(100, Math.round(score)));
}

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractText(file: File) {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".txt")) {
    return buffer.toString("utf8");
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error("Upload a PDF, DOCX, or TXT contract.");
}

function makeRisk(title: string, level: RiskLevel, clause: string, whyItMatters: string, suggestedEdit: string): ContractRisk {
  return { title, level, clause, whyItMatters, suggestedEdit };
}

function keywordSnippet(text: string, pattern: RegExp, fallback: string) {
  const match = pattern.exec(text);
  if (!match) return fallback;
  const start = Math.max(0, match.index - 90);
  const end = Math.min(text.length, match.index + 220);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function perspectiveLabel(perspective: ReviewPerspective) {
  return perspective === "vendor" ? "Vendor / Service Provider" : "Client / Buyer";
}

function analyzeLocally(text: string, perspective: ReviewPerspective): ContractAnalysis {
  const risks: ContractRisk[] = [];
  const indiaSpecificFlags: ContractRisk[] = [];
  const missingProtections: string[] = [];
  const isVendor = perspective === "vendor";

  if (/90\s*days|120\s*days|ninety\s*days|one hundred twenty/i.test(text)) {
    indiaSpecificFlags.push(
      makeRisk(
        "MSME payment delay exposure",
        "High",
        keywordSnippet(text, /90\s*days|120\s*days|ninety\s*days|one hundred twenty/i, "Payment period appears longer than MSME-friendly norms."),
        isVendor
          ? "For an MSME vendor, payment terms beyond 45 days can create cash-flow stress and weaken MSME SAMADHAAN protections."
          : "For a client, payment terms beyond 45 days can create MSMED Act compliance exposure if the vendor is an MSME.",
        "Replace with: invoices are payable within 30 days, and in any case no later than 45 days where MSME protections apply."
      )
    );
  }

  if (/cheque|post[-\s]?dated|pdc|dishono[u]?r/i.test(text)) {
    indiaSpecificFlags.push(
      makeRisk(
        "Section 138 cheque-bounce risk",
        "Medium",
        keywordSnippet(text, /cheque|post[-\s]?dated|pdc|dishono[u]?r/i, "Cheque-based payment language detected."),
        isVendor
          ? "Cheque-based payment language can delay collection and create avoidable operational disputes if dishonour handling is unclear."
          : "Cheque-based payment language can create Section 138 NI Act exposure if issuance, replacement, and dishonour processes are unclear.",
        "Add clear rules for cheque issuance, replacement, dishonour notices, cure periods, and digital payment alternatives."
      )
    );
  }

  if (/singapore|delaware|english courts|new york|foreign/i.test(text)) {
    risks.push(
      makeRisk(
        "Foreign jurisdiction burden",
        "High",
        keywordSnippet(text, /singapore|delaware|english courts|new york|foreign/i, "Foreign jurisdiction language detected."),
        `A ${perspectiveLabel(perspective).toLowerCase()} in India may find foreign dispute resolution expensive and impractical.`,
        "Use Indian governing law and a practical city-level jurisdiction, or add online arbitration with cost-sharing limits."
      )
    );
  }

  if (/consequential|indirect|all losses|unlimited liability|penalties/i.test(text)) {
    risks.push(
      makeRisk(
        "Overbroad liability",
        "High",
        keywordSnippet(text, /consequential|indirect|all losses|unlimited liability|penalties/i, "Broad liability language detected."),
        isVendor
          ? "This can expose the vendor to outsized claims, including indirect losses that exceed the contract value."
          : "This may help the client recover losses, but overbroad liability can make the agreement harder to negotiate and enforce.",
        "Cap liability at fees paid in the previous 3-6 months and exclude indirect, consequential, punitive, and loss-of-profit damages."
      )
    );
  }

  if (/terminate.{0,80}(5|7)\s*days|without cause|at any time/i.test(text)) {
    risks.push(
      makeRisk(
        "One-sided termination",
        "Medium",
        keywordSnippet(text, /terminate.{0,80}(5|7)\s*days|without cause|at any time/i, "Short termination language detected."),
        isVendor
          ? "Short or unilateral termination can leave the vendor unpaid for committed work and transition effort."
          : "Short termination may preserve client flexibility, but it should still include transition duties and payment for accepted work.",
        "Require 30 days notice, payment for completed work, and reimbursement of approved non-cancellable costs."
      )
    );
  }

  if (!/confidential|non[-\s]?disclosure|nda/i.test(text)) {
    missingProtections.push("Confidentiality obligations for business, pricing, customer, and product information.");
  }

  if (!/data protection|personal data|dpdp|privacy|security/i.test(text)) {
    missingProtections.push("Data protection and security clause aligned with India's DPDP Act where personal data is handled.");
  }

  if (!/invoice|gst|tax/i.test(text)) {
    missingProtections.push("GST invoice, tax withholding, and payment documentation responsibilities.");
  }

  if (!/scope|deliverable|acceptance|milestone/i.test(text)) {
    missingProtections.push("Clear scope, deliverables, acceptance criteria, and milestone sign-off process.");
  }

  if (!risks.length && !indiaSpecificFlags.length) {
    risks.push(
      makeRisk(
        "No major red flag found in quick scan",
        "Low",
        "The contract still needs a full legal review before signing.",
        "The quick scan did not detect the highest-risk patterns, but subtle obligations may remain.",
        "Run a lawyer/CA review for final approval and compare against your standard template."
      )
    );
  }

  const high = [...risks, ...indiaSpecificFlags].filter((risk) => risk.level === "High").length;
  const medium = [...risks, ...indiaSpecificFlags].filter((risk) => risk.level === "Medium").length;
  const score = clampScore(100 - high * 22 - medium * 11 - missingProtections.length * 5);

  return {
    riskScore: score,
    verdict: `${score >= 75 ? "Mostly workable with edits" : score >= 50 ? "Negotiate before signing" : "High-risk draft"} for the ${perspectiveLabel(perspective)}`,
    contractType: /nda|non[-\s]?disclosure/i.test(text) ? "NDA" : /service|vendor|supplier/i.test(text) ? "Vendor services agreement" : "Commercial contract",
    counterparty: "Not confidently detected",
    keyConcerns: [...indiaSpecificFlags, ...risks].slice(0, 4).map((risk) => risk.title),
    indiaSpecificFlags,
    risks,
    missingProtections,
    negotiationEmail: [
      "Hi,",
      "",
      isVendor
        ? "Thanks for sharing the draft. Before we proceed, we would like to align a few vendor protections: payment should be due within 30 days and no later than 45 days where MSME protections apply, liability should be capped to fees paid, indirect damages should be excluded, termination should include payment for completed work, and dispute resolution should be practical for an India-based SME."
        : "Thanks for sharing the draft. Before we proceed, we would like to align a few client protections: service levels should be measurable, data protection obligations should be specific, IP ownership should be clear, liability should be proportionate, and dispute resolution should be practical for an India-based business.",
      "",
      "Please share a revised draft reflecting these points so we can move ahead quickly.",
      "",
      "Best"
    ].join("\n"),
    pilotSummary: `Reviewed 1 contract for the ${perspectiveLabel(perspective)} and found ${high} high-risk item(s), ${medium} medium-risk item(s), and ${missingProtections.length} missing protection(s).`,
    source: "demo-engine"
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(raw) as Omit<ContractAnalysis, "source">;
}

async function analyzeWithGemini(text: string, perspective: ReviewPerspective) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const prompt = `You are an AI contract review copilot for Indian SMEs. Review this contract from the perspective of the ${perspectiveLabel(perspective)}. Every risk, verdict, suggested edit, missing protection, and negotiation email must be written for that party. Do not switch perspectives.

Return ONLY valid JSON matching this TypeScript type:
{
  "riskScore": number,
  "verdict": string,
  "contractType": string,
  "counterparty": string,
  "keyConcerns": string[],
  "indiaSpecificFlags": [{"title": string, "level": "High" | "Medium" | "Low", "clause": string, "whyItMatters": string, "suggestedEdit": string}],
  "risks": [{"title": string, "level": "High" | "Medium" | "Low", "clause": string, "whyItMatters": string, "suggestedEdit": string}],
  "missingProtections": string[],
  "negotiationEmail": string,
  "pilotSummary": string
}

Prioritize India-specific issues: MSME SAMADHAAN 45-day payment protections, Section 138 NI Act cheque-bounce exposure, GST/payment documentation, Indian jurisdiction/arbitration practicality, DPDP/data protection, indemnity and liability caps. If reviewing for the Vendor / Service Provider, treat delayed payment, one-sided termination, broad indemnity, acceptance discretion, and foreign dispute resolution as especially important. If reviewing for the Client / Buyer, treat SLA gaps, IP ownership, data protection, audit rights, confidentiality, and vendor accountability as especially important. This is product guidance, not legal advice.

Contract text:
${text.slice(0, 28000)}`;

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const output = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = extractJson(output);

  return {
    ...parsed,
    riskScore: clampScore(parsed.riskScore),
    source: "gemini" as const
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const pastedText = formData.get("text");
  const useSample = formData.get("sample") === "true";
  const rawPerspective = formData.get("perspective");
  const perspective: ReviewPerspective = rawPerspective === "client" ? "client" : "vendor";

  try {
    let text = typeof pastedText === "string" ? pastedText : "";

    if (file instanceof File && file.size > 0) {
      if (file.size > 6 * 1024 * 1024) {
        return NextResponse.json({ error: "Please upload a contract smaller than 6 MB." }, { status: 400 });
      }
      text = await extractText(file);
    }

    if (useSample && !text.trim()) {
      text = fallbackContract;
    }

    const cleaned = cleanText(text);
    if (cleaned.length < 80) {
      return NextResponse.json({ error: "Paste contract text or upload a PDF, DOCX, or TXT file." }, { status: 400 });
    }

    const geminiResult = await analyzeWithGemini(cleaned, perspective);
    return NextResponse.json(geminiResult || analyzeLocally(cleaned, perspective));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze this contract." }, { status: 400 });
  }
}
