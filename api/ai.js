function titleForTask(task) {
  if (task === "quiz") return "Quiz";
  if (task === "flashcards") return "Cartes mémoire";
  if (task === "explain") return "Explication";
  return "Résumé";
}

function mockOutput(note, task) {
  const content = note?.content || "Cette note a besoin de plus de contenu.";
  const firstSentence = content.split(/[.!?]\s/).filter(Boolean)[0].replace(/\n/g, " ");

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

function outputFromText(text, task) {
  return {
    title: titleForTask(task),
    body: text,
    keyIdea: task === "quiz" ? "Utilise les questions pour tester ta mémoire avant de regarder les réponses." : "",
    revisionTip: "Vérifie la réponse de l'IA avec ta note originale."
  };
}

async function callGemini(note, task, instruction, apiKeyOverride = "", modelOverride = "") {
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

  let lastStatus = "";
  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(note, task, instruction) }]
          }
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 900
        }
      })
    });

    if (!geminiResponse.ok) {
      lastStatus = formatGeminiError(model, geminiResponse.status, await geminiErrorMessage(geminiResponse));
      continue;
    }

    const geminiJson = await geminiResponse.json();
    const text = parseGeminiText(geminiJson);
    if (!text) {
      lastStatus = "Gemini a renvoyé une réponse vide.";
      continue;
    }

    return {
      output: outputFromText(text, task),
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
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const { note, task = "summary", instruction = "", apiKey = "", model = "" } = request.body || {};
    const result = await callGemini(note, task, instruction, apiKey, model);
    response.status(200).json(result);
  } catch {
    response.status(200).json({
      output: mockOutput(request.body?.note, request.body?.task || "summary"),
      provider: "mock",
      ok: false,
      message: "L'IA est en mode démo. Ajoute ta clé API pour activer les vrais résumés."
    });
  }
}
