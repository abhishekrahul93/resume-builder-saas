import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function getOpenAIKey() {
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

export function extractResponseText(data: {
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

export function parseJsonText(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned);
}
