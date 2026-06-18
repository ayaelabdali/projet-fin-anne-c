function titleForTask(task) {
  if (task === "quiz") return "Quiz";
  if (task === "flashcards") return "Flashcards";
  if (task === "explain") return "Explanation";
  return "Summary";
}

function mockOutput(note, task) {
  const content = note?.content || "This note needs more content.";
  const firstSentence = content.split(/[.!?]\s/).filter(Boolean)[0].replace(/\n/g, " ");

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

function outputFromText(text, task) {
  return {
    title: titleForTask(task),
    body: text,
    keyIdea: task === "quiz" ? "Use the questions to test recall before checking answers." : "",
    revisionTip: "Verify the AI answer against your original note."
  };
}

async function callGemini(note, task, instruction, apiKeyOverride = "", modelOverride = "") {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const preferredModel = modelOverride || process.env.GEMINI_MODEL || process.env.AI_MODEL || "gemini-2.0-flash-lite";
  const models = Array.from(new Set([preferredModel, "gemini-1.5-flash"].filter(Boolean)));

  if (!apiKey) {
    return {
      output: mockOutput(note, task),
      provider: "mock",
      ok: false,
      message: "AI is in demo mode. Add your API key above to unlock real summaries."
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
      lastStatus = `Gemini returned HTTP ${geminiResponse.status}.`;
      continue;
    }

    const geminiJson = await geminiResponse.json();
    const text = parseGeminiText(geminiJson);
    if (!text) {
      lastStatus = "Gemini returned an empty answer.";
      continue;
    }

    return {
      output: outputFromText(text, task),
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
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
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
      message: "AI is in demo mode. Add your API key above to unlock real summaries."
    });
  }
}
