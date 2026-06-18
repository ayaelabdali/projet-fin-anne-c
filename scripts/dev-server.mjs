import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const useDist = process.argv.includes("--dist");
const root = join(process.cwd(), useDist ? "dist" : "");
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function mockOutput(note, task) {
  const content = note?.content || "This note needs more content.";
  const firstSentence = content.split(/[.!?]\s/).filter(Boolean)[0];
  if (task === "quiz") {
    return {
      title: "Quiz",
      body: [
        "1. What is the central idea of this note?",
        "2. Which concept should be defined with precision?",
        `3. Give one example based on: ${firstSentence}.`
      ].join("\n"),
      keyIdea: "Good quiz questions test recall and application.",
      revisionTip: "Answer first, then compare with the original note."
    };
  }
  if (task === "flashcards") {
    return {
      title: "Flashcards",
      body: [
        `Front: What is the main idea of ${note?.title || "this note"}?`,
        `Back: ${firstSentence}.`,
        "Front: How can you test yourself?",
        "Back: Explain one example without reading the note."
      ].join("\n"),
      keyIdea: "Flashcards should stay short and reviewable.",
      revisionTip: "Use spaced repetition before the exam."
    };
  }
  if (task === "explain") {
    return {
      title: "Explanation",
      body: `${firstSentence}. Explain it by naming the concept, why it matters, and one concrete example.`,
      keyIdea: "A simple explanation is easier to defend during the presentation.",
      revisionTip: "Try explaining it in under one minute."
    };
  }
  return {
    title: "Summary",
    body: `${firstSentence}.`,
    keyIdea: "Focus on the concept, the mechanism, and one example.",
    revisionTip: "Rewrite the note as three bullet points before the exam."
  };
}

function buildPrompt(note, task, instruction) {
  const taskInstruction = {
    summary: "Summarize this student note in concise study-friendly bullet points.",
    quiz: "Create five concise quiz questions with short answers from this student note.",
    explain: "Explain this note simply for a first-year computer science student.",
    flashcards: "Create useful flashcards from this note. Use Front and Back labels."
  }[task] || "Help the student revise this note.";

  return [
    "You are MemoCoach AI, a precise study assistant for ESISA students.",
    taskInstruction,
    "Keep the answer practical, clear, and exam-oriented.",
    instruction ? `Extra instruction from the student: ${instruction}` : "",
    "",
    `Course: ${note?.course || "Unknown course"}`,
    `Title: ${note?.title || "Untitled note"}`,
    "Note:",
    note?.content || ""
  ].filter(Boolean).join("\n");
}

function parseGeminiText(payload) {
  return (payload?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || "")
    .join("\n")
    .trim();
}

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_MODEL_FALLBACKS = [
  DEFAULT_GEMINI_MODEL,
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash"
];

function normalizeGeminiModel(model) {
  return String(model || "").trim().replace(/^models\//, "");
}

function geminiModels(modelOverride = "") {
  const preferredModel = normalizeGeminiModel(modelOverride || process.env.GEMINI_MODEL || process.env.AI_MODEL);
  return Array.from(new Set([preferredModel, ...GEMINI_MODEL_FALLBACKS].filter(Boolean)));
}

async function geminiErrorMessage(response) {
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    return "";
  }

  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || "";
  } catch {
    return raw;
  }
}

function formatGeminiError(model, status, detail = "") {
  const message = String(detail || "").replace(/\s+/g, " ").trim().slice(0, 180);
  return `Gemini returned HTTP ${status} for ${model}${message ? `: ${message}` : ""}.`;
}

async function aiOutput(note, task, instruction, apiKeyOverride = "", modelOverride = "") {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || apiKeyOverride;
  const models = geminiModels(modelOverride);

  if (!apiKey) {
    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: "AI is in demo mode. Add your API key above to unlock real summaries."
    };
  }

  try {
    let lastStatus = "";
    for (const model of models) {
      const providerResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(note, task, instruction) }] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 900 }
        })
      });

      if (!providerResponse.ok) {
        lastStatus = formatGeminiError(model, providerResponse.status, await geminiErrorMessage(providerResponse));
        continue;
      }

      const providerJson = await providerResponse.json();
      const text = parseGeminiText(providerJson);
      if (!text) {
        lastStatus = "Gemini returned an empty answer.";
        continue;
      }

      return {
        output: {
          title: task === "quiz" ? "Quiz" : task === "flashcards" ? "Flashcards" : task === "explain" ? "Explanation" : "Summary",
          body: text,
          keyIdea: task === "quiz" ? "Use the questions to test recall before checking answers." : "",
          revisionTip: "Verify the AI answer against your original note."
        },
        provider: "gemini",
        ok: true,
        message: `Generated with Gemini model ${model}.`
      };
    }

    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: `${lastStatus || "Gemini could not verify the key."} Check the key and try again.`
    };
  } catch {
    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: "AI is in demo mode. Add your API key above to unlock real summaries."
    };
  }
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
  });
}

createServer(async (request, response) => {
  if (request.url === "/api/ai" && request.method === "POST") {
    const body = await readBody(request);
    const payload = JSON.parse(body || "{}");
    const result = await aiOutput(payload.note, payload.task || "summary", payload.instruction || "", payload.apiKey || "", payload.model || "");
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(result));
    return;
  }

  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, safePath);

  if (!existsSync(filePath)) {
    filePath = join(root, "index.html");
  }

  try {
    await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`MemoCoach web app running at http://127.0.0.1:${port}`);
});
