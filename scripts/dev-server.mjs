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
  const content = note?.content || "Cette note a besoin de plus de contenu.";
  const firstSentence = content.split(/[.!?]\s/).filter(Boolean)[0];
  if (task === "quiz") {
    return {
      title: "Quiz",
      body: [
        "1. Quelle est l'idée centrale de cette note ?",
        "2. Quel concept doit être défini avec précision ?",
        `3. Donne un exemple basé sur : ${firstSentence}.`
      ].join("\n"),
      keyIdea: "Un bon quiz teste la mémorisation et l'application.",
      revisionTip: "Réponds d'abord, puis compare avec la note originale."
    };
  }
  if (task === "flashcards") {
    return {
      title: "Cartes mémoire",
      body: [
        `Recto : Quelle est l'idée principale de ${note?.title || "cette note"} ?`,
        `Verso : ${firstSentence}.`,
        "Recto : Comment peux-tu te tester ?",
        "Verso : Explique un exemple sans relire la note."
      ].join("\n"),
      keyIdea: "Les cartes mémoire doivent rester courtes et faciles à revoir.",
      revisionTip: "Utilise la répétition espacée avant l'examen."
    };
  }
  if (task === "explain") {
    return {
      title: "Explication",
      body: `${firstSentence}. Explique en nommant le concept, son importance et un exemple concret.`,
      keyIdea: "Une explication simple est plus facile à défendre pendant la présentation.",
      revisionTip: "Essaie de l'expliquer à voix haute en moins d'une minute."
    };
  }
  return {
    title: "Résumé",
    body: `${firstSentence}.`,
    keyIdea: "Concentre-toi sur le concept, le mécanisme et un exemple.",
    revisionTip: "Réécris la note en trois points avant l'examen."
  };
}

function buildPrompt(note, task, instruction) {
  const taskInstruction = {
    summary: "Résume cette note d'étudiant en points courts et utiles pour réviser.",
    quiz: "Crée cinq questions de quiz concises avec des réponses courtes à partir de cette note.",
    explain: "Explique cette note simplement pour un étudiant de première année en informatique.",
    flashcards: "Crée des cartes mémoire utiles à partir de cette note. Utilise les libellés Recto et Verso."
  }[task] || "Aide l'étudiant à réviser cette note.";

  return [
    "Tu es MemoCoach AI, un assistant de révision précis pour les étudiants de l'ESISA.",
    taskInstruction,
    "Réponds en français. Reste pratique, clair et orienté examen.",
    instruction ? `Instruction supplémentaire de l'étudiant : ${instruction}` : "",
    "",
    `Cours : ${note?.course || "Cours inconnu"}`,
    `Titre : ${note?.title || "Note sans titre"}`,
    "Note :",
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
  return `Gemini a renvoyé HTTP ${status} pour ${model}${message ? ` : ${message}` : ""}.`;
}

async function aiOutput(note, task, instruction, apiKeyOverride = "", modelOverride = "") {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || apiKeyOverride;
  const models = geminiModels(modelOverride);

  if (!apiKey) {
    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: "L'IA est en mode démo. Ajoute ta clé API pour activer les vrais résumés."
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
        lastStatus = "Gemini a renvoyé une réponse vide.";
        continue;
      }

      return {
        output: {
          title: task === "quiz" ? "Quiz" : task === "flashcards" ? "Cartes mémoire" : task === "explain" ? "Explication" : "Résumé",
          body: text,
          keyIdea: task === "quiz" ? "Utilise les questions pour tester ta mémoire avant de regarder les réponses." : "",
          revisionTip: "Vérifie la réponse de l'IA avec ta note originale."
        },
        provider: "gemini",
        ok: true,
        message: `Généré avec le modèle Gemini ${model}.`
      };
    }

    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: `${lastStatus || "Gemini n'a pas pu vérifier la clé."} Vérifie la clé et réessaie.`
    };
  } catch {
    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: "L'IA est en mode démo. Ajoute ta clé API pour activer les vrais résumés."
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
    response.end("Introuvable");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Application web MemoCoach lancée sur http://127.0.0.1:${port}`);
});
