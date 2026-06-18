const STORAGE_KEY = "memocoach-web-state-v4";
const OLD_STORAGE_KEYS = ["memocoach-web-state-v3", "memocoach-web-state-v2", "memocoach-web-state-v1"];
const DEMO_AI_MESSAGE = "AI is in demo mode. Add your API key above to unlock real summaries.";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

const seedNotes = [
  {
    id: 1,
    title: "Pointers in C",
    course: "C Programming",
    content:
      "Pointers are variables that store memory addresses instead of actual values.\n\nIn C, a pointer holds the address of another variable, and we use the * operator to access the value at that address.\n\nThe & operator is used to get the address of a variable.\n\nExample:\nint x = 10;\nint *p = &x; // p stores address of x\nprintf(\"%d\", *p); // prints 10",
    createdAt: "2026-06-18T15:37:08Z",
    pinned: true
  },
  {
    id: 2,
    title: "Binary Search Algorithm",
    course: "Algorithms",
    content:
      "Binary search works on sorted arrays. It repeatedly divides the search interval in half until the target value is found or the interval becomes empty.",
    createdAt: "2026-06-17T10:20:00Z",
    pinned: false
  },
  {
    id: 3,
    title: "Database Normalization",
    course: "Databases",
    content:
      "Normalization organizes relational data to reduce duplication and avoid update anomalies. First normal form removes repeating groups, second normal form removes partial dependency, and third normal form removes transitive dependency.",
    createdAt: "2026-06-16T09:10:00Z",
    pinned: false
  },
  {
    id: 4,
    title: "Operating System Processes",
    course: "Operating Systems",
    content:
      "A process is a running program with its own address space, registers, stack, heap, and execution state. The operating system scheduler decides which process runs next.",
    createdAt: "2026-06-15T12:10:00Z",
    pinned: false
  },
  {
    id: 5,
    title: "Dynamic Programming Intro",
    course: "Algorithms",
    content:
      "Dynamic programming solves problems by breaking them into overlapping subproblems and storing the answers so they are not recomputed.",
    createdAt: "2026-06-14T15:00:00Z",
    pinned: false
  },
  {
    id: 6,
    title: "HTTP and REST APIs",
    course: "Web Development",
    content:
      "REST APIs expose resources through URLs and use HTTP methods such as GET, POST, PUT, PATCH, and DELETE to perform actions.",
    createdAt: "2026-06-12T16:45:00Z",
    pinned: false
  },
  {
    id: 7,
    title: "Graphs and BFS",
    course: "Data Structures",
    content:
      "Breadth-first search explores a graph level by level using a queue. It is useful for shortest paths in unweighted graphs.",
    createdAt: "2026-06-11T11:30:00Z",
    pinned: false
  }
];

const seedEvents = {
  1: [
    {
      id: "evt-quiz",
      task: "Quiz",
      provider: "Mock",
      createdAt: "2026-06-18T15:37:09Z",
      result: "3 questions generated"
    },
    {
      id: "evt-summary",
      task: "Summary",
      provider: "Mock",
      createdAt: "2026-06-18T15:37:09Z",
      result: "Note summarized"
    },
    {
      id: "evt-created",
      task: "Note Created",
      provider: "Manual",
      createdAt: "2026-06-18T15:37:08Z",
      result: "Manually created"
    }
  ]
};

const navItems = [
  ["Dashboard", "layout-dashboard"],
  ["Notes", "file-text"],
  ["Courses", "book-open"],
  ["AI Tools", "wand-sparkles"],
  ["History", "history"],
  ["Study Sets", "layers"],
  ["Calendar", "calendar-days"],
  ["Settings", "settings"]
];

const taskMeta = {
  summary: {
    label: "Summary",
    icon: "list-checks",
    hint: "Condense the note into exam revision points."
  },
  quiz: {
    label: "Quiz",
    icon: "clipboard-list",
    hint: "Generate recall questions with short answers."
  },
  explain: {
    label: "Explain",
    icon: "messages-square",
    hint: "Explain the concept in a simpler way."
  },
  flashcards: {
    label: "Flashcards",
    icon: "layers",
    hint: "Create quick front and back review cards."
  }
};

const root = document.getElementById("root");
const initialState = loadState();

let state = {
  ...initialState,
  view: "Dashboard",
  activeTab: "summary",
  search: "",
  courseFilter: "All courses",
  assistantTask: "summary",
  assistantPrompt: "",
  mobileNavOpen: false,
  notesDrawerOpen: false,
  isGenerating: false,
  connectionBusy: false,
  provider: "mock",
  apiMessage: initialState.connectionMessage || DEMO_AI_MESSAGE,
  apiKey: initialState.apiKey || "",
  connectionStatus: initialState.connectionStatus || "demo",
  connectionMessage: initialState.connectionMessage || DEMO_AI_MESSAGE,
  aiResult: null,
  notice: ""
};
state.aiResult = createMockResult(selectedNote(), "summary");
document.documentElement.dataset.theme = state.theme || "light";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value, mode = "date") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (mode === "time") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (mode === "weekday") {
    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function firstSentence(text) {
  return String(text || "This note needs more content.")
    .replace(/\s+/g, " ")
    .split(/[.!?]\s/)
    .filter(Boolean)[0]
    .trim();
}

function truncate(text, max = 140) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function formatMonthDay(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return formatMonthDay(Date.now());
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function isUntitledTitle(title) {
  const clean = String(title || "").trim();
  return !clean || /^untitled note$/i.test(clean);
}

function generatedNoteTitle(note) {
  const words = String(note?.content || "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 5).join(" ");
  return `Note from ${formatMonthDay(note?.createdAt || new Date().toISOString())}`;
}

function noteTitle(note) {
  if (!note) return "Note";
  return isUntitledTitle(note.title) || note.autoTitle ? generatedNoteTitle(note) : String(note.title).trim();
}

function ensureNoteTitle(note) {
  const autoTitle = Boolean(note.autoTitle) || isUntitledTitle(note.title);
  return { ...note, title: autoTitle ? generatedNoteTitle(note) : String(note.title).trim(), autoTitle };
}

function isLiveAi() {
  return state.provider === "gemini" && state.connectionStatus === "success";
}

function selectedNote() {
  return state.notes.find((note) => note.id === state.selectedId) || state.notes[0];
}

function selectedStudyNote() {
  return state.notes.find((note) => note.id === state.studyNoteId) || selectedNote();
}

function getCourses() {
  return ["All courses", ...Array.from(new Set(state.notes.map((note) => note.course || "General")))];
}

function filteredNotes() {
  return state.notes.filter((note) => {
    const matchesCourse = state.courseFilter === "All courses" || note.course === state.courseFilter;
    const haystack = `${noteTitle(note)} ${note.course} ${note.content}`.toLowerCase();
    return matchesCourse && haystack.includes(state.search.toLowerCase());
  });
}

function allEvents() {
  return Object.entries(state.events)
    .flatMap(([noteId, events]) => {
      const note = state.notes.find((item) => item.id === Number(noteId));
      return (events || []).map((event) => ({
        ...event,
        noteId: Number(noteId),
        noteTitle: note ? noteTitle(note) : "Unknown note",
        course: note?.course || "General"
      }));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function courseSummaries() {
  return getCourses()
    .filter((course) => course !== "All courses")
    .map((course) => {
      const notes = state.notes.filter((note) => note.course === course);
      const wordCount = notes.reduce((total, note) => total + countWords(note.content), 0);
      const aiCount = notes.reduce((total, note) => total + (state.events[note.id] || []).filter((event) => event.provider !== "Manual").length, 0);
      const progress = Math.min(96, 34 + notes.length * 9 + aiCount * 6);
      return {
        course,
        notes,
        wordCount,
        aiCount,
        progress,
        latest: notes.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      };
    });
}

function createMockResult(note, task) {
  const clean = firstSentence(note?.content);

  if (task === "quiz") {
    return {
      title: "Quiz",
      body: [
        "1. What is the central idea of this note?",
        "2. Which term or mechanism must be defined precisely?",
        `3. Give one practical example based on: ${clean}.`
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
        `Back: ${clean}.`,
        "Front: What example can prove you understood it?",
        "Back: Create a tiny example and explain each step."
      ].join("\n"),
      keyIdea: "Flashcards should be short enough to review quickly.",
      revisionTip: "Review once today, once tomorrow, and once before the exam."
    };
  }

  if (task === "explain") {
    return {
      title: "Explanation",
      body: `${clean}. In simple terms, identify the concept, say why it matters, then connect it to one concrete example.`,
      keyIdea: "Simple explanations are easier to defend during the presentation.",
      revisionTip: "Try explaining it out loud in under one minute."
    };
  }

  return {
    title: "Summary",
    body: `${clean}.`,
    keyIdea:
      note?.course === "C Programming"
        ? "Pointers allow efficient memory access and manipulation in C."
        : "Focus on the definition, the rule, and one small example.",
    revisionTip: "Rewrite this note as three bullet points and test yourself with one example."
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || OLD_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);

  try {
    if (!stored) throw new Error("empty");
    const parsed = JSON.parse(stored);
    const notes = sanitizeNotes(parsed.notes?.length ? parsed.notes : seedNotes);
    return {
      notes,
      events: parsed.events || seedEvents,
      selectedId: notes.some((note) => note.id === parsed.selectedId) ? parsed.selectedId : notes[0].id,
      studyNoteId: parsed.studyNoteId || parsed.selectedId || notes[0].id,
      flashcardIndex: parsed.flashcardIndex || 0,
      flashcardFlipped: Boolean(parsed.flashcardFlipped),
      completedSessions: Array.isArray(parsed.completedSessions) ? parsed.completedSessions : [],
      theme: parsed.theme || "light",
      apiKey: parsed.apiKey || "",
      connectionStatus: parsed.connectionStatus || "demo",
      connectionMessage: parsed.connectionMessage || DEMO_AI_MESSAGE
    };
  } catch {
    return {
      notes: seedNotes,
      events: seedEvents,
      selectedId: 1,
      studyNoteId: 1,
      flashcardIndex: 0,
      flashcardFlipped: false,
      completedSessions: [],
      theme: "light"
    };
  }
}

function sanitizeNotes(notes) {
  return notes
    .map((note, index) => ({
      ...note,
      id: Number(note.id) || index + 1,
      course: String(note.course || "").trim() || "General",
      content: String(note.content ?? "").trim(),
      createdAt: note.createdAt || new Date().toISOString(),
      pinned: Boolean(note.pinned),
      autoTitle: Boolean(note.autoTitle) || isUntitledTitle(note.title)
    }))
    .map(ensureNoteTitle);
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      notes: state.notes,
      events: state.events,
      selectedId: state.selectedId,
      studyNoteId: state.studyNoteId,
      flashcardIndex: state.flashcardIndex,
      flashcardFlipped: state.flashcardFlipped,
      completedSessions: state.completedSessions,
      theme: state.theme,
      apiKey: state.apiKey,
      connectionStatus: state.connectionStatus,
      connectionMessage: state.connectionMessage
    })
  );
}

function icon(name, size = 21) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}

function render() {
  document.documentElement.dataset.theme = state.theme || "light";
  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="workspace">
        ${renderTopbar()}
        ${renderMainView()}
      </main>
      ${state.mobileNavOpen ? `<button class="nav-scrim" data-action="close-nav" aria-label="Close navigation">${icon("x", 24)}</button>` : ""}
      ${state.notice ? `<div class="toast" role="status">${icon("check", 17)} ${escapeHtml(state.notice)}</div>` : ""}
    </div>
  `;

  wireEvents();
  if (window.lucide) window.lucide.createIcons();
}

function renderSidebar() {
  return `
    <aside class="sidebar ${state.mobileNavOpen ? "open" : ""}">
      <div class="brand">
        <div class="brand-mark">${icon("graduation-cap", 31)}</div>
        <div>
          <strong>MemoCoach <span>AI</span></strong>
          <small>Study Smarter, Remember More</small>
        </div>
      </div>

      <nav class="nav-list" aria-label="Main navigation">
        ${navItems
          .map(
            ([label, iconName]) => `
          <button class="${state.view === label ? "active" : ""}" data-action="nav" data-view="${escapeHtml(label)}" aria-current="${state.view === label ? "page" : "false"}">
            ${icon(iconName, 22)}
            <span>${label}</span>
          </button>
        `
          )
          .join("")}
      </nav>

      <div class="sidebar-footer">
        <button class="student" data-action="nav" data-view="Settings">
          <div class="avatar">AM</div>
          <span>
            <strong>Alex Martin</strong>
            <small>alex.martin@uni.edu</small>
          </span>
        </button>
        <div class="mini-status">
          ${icon("database", 18)}
          <span>Browser data saved</span>
        </div>
      </div>
    </aside>
  `;
}

function renderTopbar() {
  const nav = navItems.find(([label]) => label === state.view) || navItems[0];
  const live = isLiveAi();
  return `
    <header class="topbar">
      <button class="icon-button mobile-menu" data-action="open-nav" aria-label="Open navigation">${icon("menu", 22)}</button>
      <div class="top-title">
        ${icon(nav[1], 23)}
        <strong>${escapeHtml(state.view)}</strong>
      </div>
      <div class="top-actions">
        <button class="status-pill ${live ? "live" : "demo"}" data-action="nav" data-view="Settings">
          <span class="status-dot" aria-hidden="true"></span>
          ${live ? "Live AI" : "Demo mode"}
        </button>
        <button class="icon-button" data-action="toggle-theme" aria-label="Toggle theme">${icon(state.theme === "dark" ? "sun" : "moon", 21)}</button>
        <button class="icon-button badge" data-action="nav" data-view="History" aria-label="Notifications">${icon("bell", 21)}<span>${allEvents().length}</span></button>
      </div>
    </header>
  `;
}

function renderMainView() {
  if (state.view === "Notes") return renderNotesView();
  if (state.view === "Courses") return renderCoursesView();
  if (state.view === "AI Tools") return renderAiToolsView();
  if (state.view === "History") return renderHistoryView();
  if (state.view === "Study Sets") return renderStudySetsView();
  if (state.view === "Calendar") return renderCalendarView();
  if (state.view === "Settings") return renderSettingsView();
  return renderDashboard();
}

function renderDashboard() {
  const note = selectedNote();
  const events = allEvents();
  const words = state.notes.reduce((total, item) => total + countWords(item.content), 0);
  return `
    <section class="dashboard-view">
      <div class="hero-band">
        <div class="hero-copy">
          <span class="eyebrow">${icon("sparkles", 16)} Student study cockpit</span>
          <h1>Turn class notes into revision material.</h1>
          <p>Write notes, generate quizzes, review flashcards, and keep every AI result in one local study workspace.</p>
          <div class="hero-actions">
            <button class="primary-action" data-action="generate-summary">${icon("sparkles", 18)} Summarize current note</button>
            <button class="secondary-action" data-action="nav" data-view="Study Sets">${icon("layers", 18)} Start review</button>
          </div>
        </div>
      </div>

      <div class="metric-strip" aria-label="Study metrics">
        ${renderMetric("Notes", state.notes.length, "file-text", "blue")}
        ${renderMetric("Courses", getCourses().length - 1, "book-open", "green")}
        ${renderMetric("Words", words, "text", "amber")}
        ${renderMetric("AI runs", events.filter((event) => event.provider !== "Manual").length, "wand-sparkles", "violet")}
      </div>

      <button class="notes-drawer-trigger" data-action="open-notes-drawer">${icon("menu", 18)} Notes list</button>
      <div class="dashboard-grid">
        ${renderNotesPane()}
        ${renderEditorPane()}
        ${renderAssistantPane(state.events[note.id] || [])}
      </div>
      ${state.notesDrawerOpen ? `<button class="notes-drawer-scrim" data-action="close-notes-drawer" aria-label="Close notes drawer"></button>` : ""}
    </section>
  `;
}

function renderMetric(label, value, iconName, tone) {
  return `
    <div class="metric ${tone}">
      <span>${icon(iconName, 19)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(label)}</small>
    </div>
  `;
}

function renderNotesPane() {
  const note = selectedNote();
  const visibleNotes = filteredNotes();
  return `
    <section class="notes-pane panel-surface ${state.notesDrawerOpen ? "open" : ""}">
      <div class="pane-toolbar">
        <button class="new-note" data-action="new-note">${icon("plus", 20)} New note</button>
        <button class="tool-button" data-action="pin-note" aria-label="Pin selected note">${icon(note.pinned ? "pin-off" : "pin", 20)}</button>
        <label class="search-box">
          ${icon("search", 19)}
          <input data-field="search" value="${escapeHtml(state.search)}" placeholder="Find notes" />
        </label>
      </div>

      <div class="notes-heading">
        <span>Notes (${visibleNotes.length})</span>
        <select data-field="course-filter" aria-label="Filter by course">
          ${getCourses().map((course) => `<option ${course === state.courseFilter ? "selected" : ""}>${escapeHtml(course)}</option>`).join("")}
        </select>
      </div>

      <div class="note-list">
        ${visibleNotes
          .map(
            (item) => `
          <button class="note-row ${item.id === note.id ? "selected" : ""}" data-action="select-note" data-id="${item.id}">
            <span class="note-main">
              <strong>${escapeHtml(noteTitle(item))}</strong>
              <small>${escapeHtml(item.course)} - ${countWords(item.content)} words</small>
            </span>
            <span class="note-meta">
              ${item.pinned ? icon("pin", 16) : icon("chevron-right", 16)}
              <small>${formatDate(item.createdAt, "weekday")}</small>
            </span>
          </button>
        `
          )
          .join("") || `<div class="empty-state">${icon("search", 24)}<strong>No notes found</strong><p>Try another course or search term.</p></div>`}
      </div>
    </section>
  `;
}

function renderEditorPane() {
  const note = selectedNote();
  const courses = getCourses().filter((course) => course !== "All courses");
  return `
    <section class="editor-pane panel-surface">
      <div class="editor-header">
        <div class="editor-title">
          ${icon("notebook-pen", 22)}
          <div>
            <h2>${escapeHtml(noteTitle(note))}</h2>
            <small>${escapeHtml(note.course)} - ${countWords(note.content)} words</small>
          </div>
        </div>
        <div class="editor-actions">
          <button class="save-button" data-action="save-note">${icon("check", 18)} Save</button>
          <button class="icon-button" data-action="pin-note" aria-label="Pin note">${icon(note.pinned ? "pin-off" : "pin", 20)}</button>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="course">Course</label>
          <select id="course" data-field="course">
            ${courses.map((course) => `<option value="${escapeHtml(course)}" ${course === note.course ? "selected" : ""}>${escapeHtml(course)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="title">Title</label>
          <input id="title" data-field="title" value="${escapeHtml(note.autoTitle || isUntitledTitle(note.title) ? "" : note.title)}" placeholder="${escapeHtml(noteTitle(note))}" />
        </div>
      </div>

      <div class="field editor-field">
        <label for="content">Content</label>
        <div class="format-bar">
          <button aria-label="Bold" title="Bold"><strong>B</strong></button>
          <button aria-label="Italic" title="Italic"><span class="italic">I</span></button>
          <button aria-label="Underline" title="Underline"><span class="underline">U</span></button>
          <button aria-label="Bulleted list" title="List">${icon("list", 17)}</button>
          <button aria-label="Code" title="Code">${icon("code-2", 17)}</button>
          <button aria-label="Undo" title="Undo">${icon("undo-2", 17)}</button>
        </div>
        <textarea id="content" data-field="content">${escapeHtml(note.content)}</textarea>
      </div>

      <div class="editor-status">
        <span>${note.pinned ? "Pinned for review" : "Ready to revise"}</span>
        <span class="word-count">${countWords(note.content)} words</span>
      </div>

      <div class="editor-cta">
        <button class="primary-action" data-action="generate-summary" ${state.isGenerating ? "disabled" : ""}>${icon("sparkles", 18)} Summary</button>
        <button class="dark-action" data-action="generate-quiz" ${state.isGenerating ? "disabled" : ""}>${icon("clipboard-list", 18)} Quiz</button>
        <button class="secondary-action" data-action="study-current-note">${icon("layers", 18)} Study</button>
        <button class="ghost-action" data-action="clear-panel">${icon("eraser", 18)} Clear</button>
      </div>
    </section>
  `;
}

function renderAssistantPane(events) {
  return `
    <section class="assistant-pane panel-surface">
      <div class="assistant-header">
        <div>${icon("sparkles", 22)} <strong>AI Coach</strong></div>
        <span class="provider-chip ${state.provider === "gemini" ? "live" : ""}">${state.provider === "gemini" ? "Gemini" : "Mock"}</span>
      </div>

      <div class="tabs" role="tablist" aria-label="AI output">
        ${[
          ["summary", "ti-file-text", "Summary"],
          ["quiz", "ti-question-mark", "Quiz"],
          ["history", "ti-clock", "History"]
        ]
          .map(
            ([tab, iconClass, label]) => `
          <button class="${state.activeTab === tab ? "active" : ""}" data-action="tab" data-tab="${tab}">
            <i class="ti ${iconClass}" aria-hidden="true"></i>
            ${label}
          </button>
        `
          )
          .join("")}
      </div>

      ${state.activeTab !== "history" ? renderAiCard() : renderHistoryFull(events)}
      ${renderHistoryCompact(events)}

      <p class="disclaimer">${icon("circle-help", 17)} ${escapeHtml(state.apiMessage)}</p>
    </section>
  `;
}

function renderAiCard() {
  const result = state.aiResult || createMockResult(selectedNote(), "summary");
  return `
    <article class="ai-card ${state.isGenerating ? "loading" : ""}">
      <div class="ai-card-title">
        <div>
          <span class="eyebrow">${icon(state.provider === "gemini" ? "sparkles" : "cpu", 15)} ${state.provider === "gemini" ? "Gemini output" : "Demo output"}</span>
          <h2>${state.isGenerating ? "Generating..." : escapeHtml(result.title)}</h2>
        </div>
        <button class="icon-button" data-action="copy-ai" aria-label="Copy output">${icon("copy", 19)}</button>
      </div>
      <p class="ai-body">${escapeHtml(state.isGenerating ? "Contacting the AI assistant and preparing your study result..." : result.body)}</p>
      ${result.keyIdea ? `<div class="divider"></div><h3>Key idea</h3><p>${escapeHtml(result.keyIdea)}</p>` : ""}
      ${result.revisionTip ? `<h3>Revision tip</h3><p>${escapeHtml(result.revisionTip)}</p>` : ""}
      <footer>
        <span>${escapeHtml(state.provider)} - ${formatDate(new Date().toISOString())}</span>
        <span class="feedback">${icon("thumbs-up", 18)} ${icon("thumbs-down", 18)}</span>
      </footer>
    </article>
  `;
}

function renderNotesView() {
  const visibleNotes = filteredNotes();
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("file-text", 16)} Library</span>
          <h1>Notes Library</h1>
          <p>Search, edit, and send any note to the AI coach or study set.</p>
        </div>
        <button class="new-note" data-action="new-note">${icon("plus", 20)} New note</button>
      </div>

      <div class="control-row">
        <label class="search-box wide">${icon("search", 20)}<input data-field="search" value="${escapeHtml(state.search)}" placeholder="Search notes" /></label>
        <select data-field="course-filter">
          ${getCourses().map((course) => `<option ${course === state.courseFilter ? "selected" : ""}>${escapeHtml(course)}</option>`).join("")}
        </select>
      </div>

      <div class="notes-card-grid">
        ${visibleNotes
          .map(
            (note) => `
          <article class="note-card">
            <div class="note-card-head">
              <span>${icon(note.pinned ? "pin" : "file-text", 21)}</span>
              <small>${escapeHtml(note.course)}</small>
            </div>
            <h2>${escapeHtml(noteTitle(note))}</h2>
            <p>${escapeHtml(truncate(note.content, 150))}</p>
            <div class="note-card-foot">
              <span>${countWords(note.content)} words</span>
              <button data-action="open-note" data-id="${note.id}">${icon("pen-line", 17)} Open</button>
            </div>
          </article>
        `
          )
          .join("") || `<div class="empty-state wide-state">${icon("search", 28)}<strong>No matching notes</strong><p>Adjust your filter and the library will update instantly.</p></div>`}
      </div>
    </section>
  `;
}

function renderCoursesView() {
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("book-open", 16)} Course map</span>
          <h1>Courses</h1>
          <p>Track each course by notes, AI activity, progress, and the next item to review.</p>
        </div>
      </div>
      <div class="course-grid">
        ${courseSummaries()
          .map(
            (summary) => `
          <article class="course-card">
            <div class="course-card-top">
              <span>${icon("book-open", 24)}</span>
              <small>${summary.notes.length} notes - ${summary.wordCount} words</small>
            </div>
            <h2>${escapeHtml(summary.course)}</h2>
            <p>${escapeHtml(summary.latest ? truncate(summary.latest.content, 96) : "No notes yet.")}</p>
            <div class="progress-line"><span style="width:${summary.progress}%"></span></div>
            <div class="course-card-actions">
              <button data-action="filter-course" data-course="${escapeHtml(summary.course)}">${icon("search", 17)} Notes</button>
              <button data-action="course-quiz" data-course="${escapeHtml(summary.course)}">${icon("clipboard-list", 17)} Quiz</button>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAiToolsView() {
  const note = selectedNote();
  return `
    <section class="page-view ai-tools-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("wand-sparkles", 16)} Assistant studio</span>
          <h1>AI Tools</h1>
          <p>Pick a note, choose a task, add exam instructions, then generate a saved result.</p>
        </div>
        <span class="provider-chip ${state.provider === "gemini" ? "live" : ""}">${state.provider === "gemini" ? "Gemini live" : "Mock mode"}</span>
      </div>

      <div class="ai-studio-grid">
        <section class="tool-panel panel-surface">
          <div class="task-grid">
            ${Object.entries(taskMeta)
              .map(
                ([task, meta]) => `
              <button class="task-card ${state.assistantTask === task ? "active" : ""}" data-action="task" data-task="${task}">
                ${icon(meta.icon, 22)}
                <strong>${escapeHtml(meta.label)}</strong>
                <small>${escapeHtml(meta.hint)}</small>
              </button>
            `
              )
              .join("")}
          </div>

          <div class="field">
            <label>Selected note</label>
            <select data-field="selected-note">
              ${state.notes.map((item) => `<option value="${item.id}" ${item.id === note.id ? "selected" : ""}>${escapeHtml(noteTitle(item))}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Extra instruction</label>
            <textarea class="short-textarea" data-field="assistant-prompt" placeholder="Example: answer in French, make it short, or focus on exam questions.">${escapeHtml(state.assistantPrompt)}</textarea>
          </div>
          <button class="primary-action full-width" data-action="generate-assistant" ${state.isGenerating ? "disabled" : ""}>${icon("sparkles", 19)} Run AI assistant</button>
        </section>

        <section class="tool-output panel-surface">
          ${renderAiCard()}
          <div class="output-actions">
            <button class="secondary-action" data-action="copy-ai">${icon("copy", 18)} Copy</button>
            <button class="secondary-action" data-action="nav" data-view="History">${icon("history", 18)} History</button>
            <button class="secondary-action" data-action="nav" data-view="Study Sets">${icon("layers", 18)} Study set</button>
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderHistoryView() {
  const events = allEvents();
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("history", 16)} Activity</span>
          <h1>History</h1>
          <p>See every generated result, save, test, and note event in one activity feed.</p>
        </div>
      </div>
      <div class="activity-feed">
        ${events
          .map(
            (event) => `
          <article class="activity-card">
            <span class="activity-icon">${icon(iconForEvent(event.task), 21)}</span>
            <div>
              <div class="activity-title">
                <h2>${escapeHtml(event.task)}</h2>
                <span class="provider-chip compact ${String(event.provider).toLowerCase() === "gemini" ? "live" : ""}">${escapeHtml(event.provider)}</span>
              </div>
              <p>${escapeHtml(event.noteTitle)} - ${escapeHtml(event.course)}</p>
              <small>${escapeHtml(event.result)} - ${formatDate(event.createdAt, "time")}</small>
            </div>
            <button class="icon-button" data-action="open-note" data-id="${event.noteId}" aria-label="Open note">${icon("arrow-right", 19)}</button>
          </article>
        `
          )
          .join("") || `<div class="empty-state wide-state">${icon("history", 28)}<strong>No activity yet</strong><p>Generate a result to create your first history item.</p></div>`}
      </div>
    </section>
  `;
}

function renderStudySetsView() {
  if (state.notes.length === 0) {
    return `
      <section class="page-view study-view">
        <div class="page-heading">
          <div>
            <span class="eyebrow">${icon("layers", 16)} Active recall</span>
            <h1>Study Sets</h1>
            <p>Generate flashcards from your notes when you are ready to revise.</p>
          </div>
        </div>
        <article class="study-empty-card panel-surface">
          <i class="ti ti-cards" aria-hidden="true"></i>
          <h2>No study sets yet</h2>
          <p>Create a note first, then generate flashcards for active recall.</p>
          <button class="primary-action" data-action="new-note">Generate your first study set from a note ${icon("arrow-right", 17)}</button>
        </article>
      </section>
    `;
  }

  const note = selectedStudyNote();
  const cards = studyCardsFor(note);
  const index = Math.min(state.flashcardIndex, cards.length - 1);
  const card = cards[index];
  return `
    <section class="page-view study-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("layers", 16)} Active recall</span>
          <h1>Study Sets</h1>
          <p>Choose a deck, flip cards, and move through the review session like a real study tool.</p>
        </div>
        <button class="primary-action" data-action="generate-flashcards">${icon("sparkles", 18)} Generate flashcards</button>
      </div>

      <div class="study-grid">
        <section class="deck-list">
          ${state.notes
            .map(
              (item) => `
            <article class="study-set-card ${item.id === note.id ? "active" : ""}">
              <div class="card-count-badge">
                <strong>${studyCardsFor(item).length}</strong>
                <span>cards</span>
              </div>
              <div class="study-card-body">
                <span class="course-tag">${escapeHtml(item.course)}</span>
                <h2>${escapeHtml(noteTitle(item))}</h2>
                <p>${escapeHtml(truncate(item.content, 40))}</p>
              </div>
              <button class="start-review" data-action="study-note" data-id="${item.id}">Start review <span aria-hidden="true">&rarr;</span></button>
            </article>
          `
            )
            .join("")}
        </section>

        <section class="flashcard-panel panel-surface">
          <div class="flashcard-head">
            <div>
              <h2>${escapeHtml(noteTitle(note))}</h2>
              <p>${escapeHtml(note.course)} - card ${index + 1} of ${cards.length}</p>
            </div>
            <div class="progress-ring">${Math.round(((index + 1) / cards.length) * 100)}%</div>
          </div>
          <button class="flashcard ${state.flashcardFlipped ? "flipped" : ""}" data-action="flip-card">
            <span>${state.flashcardFlipped ? "Back" : "Front"}</span>
            <strong>${escapeHtml(state.flashcardFlipped ? card.back : card.front)}</strong>
          </button>
          <div class="flashcard-actions">
            <button class="secondary-action" data-action="prev-card">${icon("arrow-left", 18)} Previous</button>
            <button class="dark-action" data-action="flip-card">${icon("rotate-3d", 18)} Flip</button>
            <button class="secondary-action" data-action="next-card">Next ${icon("arrow-right", 18)}</button>
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderCalendarView() {
  const plan = revisionPlan();
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("calendar-days", 16)} Revision plan</span>
          <h1>Calendar</h1>
          <p>Plan short review sessions and mark them done as you study.</p>
        </div>
      </div>

      <div class="calendar-layout">
        <section class="week-strip panel-surface">
          ${plan.map((session) => `<span class="${session.done ? "done" : ""}">${escapeHtml(session.dayShort)}<strong>${session.dayNumber}</strong></span>`).join("")}
        </section>
        <section class="session-list">
          ${plan
            .map(
              (session) => `
            <article class="session-card ${session.done ? "done" : ""} ${session.today ? "today" : ""}">
              <button class="session-check" data-action="toggle-session" data-session="${session.id}" aria-label="Toggle session">${icon(session.done ? "check" : "circle", 20)}</button>
              <div>
                <small>${escapeHtml(session.label)} - ${formatDate(session.date, "weekday")}</small>
                <h2>${escapeHtml(noteTitle(session.note))}</h2>
                <p>${escapeHtml(session.note.course)}</p>
              </div>
              <span class="session-date">${formatDate(session.date, "weekday")}</span>
              <span class="session-task">${escapeHtml(session.task)}</span>
              <button class="secondary-action" data-action="study-note" data-id="${session.note.id}">${icon("layers", 17)} Review</button>
            </article>
          `
            )
            .join("")}
        </section>
      </div>
    </section>
  `;
}

function renderSettingsView() {
  const statusTone = state.connectionStatus === "success" ? "success" : state.connectionStatus === "error" ? "error" : "demo";
  const statusTitle = state.connectionStatus === "success" ? "Live AI is connected" : state.connectionStatus === "error" ? "Connection failed" : state.connectionStatus === "testing" ? "Checking connection" : "Demo mode";
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("settings", 16)} Project setup</span>
          <h1>Settings</h1>
          <p>Add your Gemini key in Vercel, or paste it once here for a local browser demo.</p>
        </div>
      </div>

      <div class="settings-grid">
        <section class="settings-panel api-setup-card panel-surface">
          <h2>Connect Gemini</h2>
          <div class="setup-steps">
            <div><strong>1</strong><span>Get your free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a></span></div>
            <div><strong>2</strong><span>Copy it and paste below</span></div>
            <div><strong>3</strong><span>Save - AI will activate instantly</span></div>
          </div>
          <div class="api-key-row">
            <label for="api-key">Gemini API key</label>
            <div>
              <input id="api-key" type="text" data-field="api-key" value="${escapeHtml(state.apiKey)}" placeholder="Paste GEMINI_API_KEY here" autocomplete="off" spellcheck="false" />
              <button class="primary-action" data-action="save-api-key" ${state.connectionBusy ? "disabled" : ""}>${state.connectionBusy ? "Testing..." : "Save & test"}</button>
            </div>
          </div>
          <p class="settings-note">Default model: <code>${DEFAULT_GEMINI_MODEL}</code>, with current Gemini Flash fallbacks server-side.</p>
        </section>

        <section class="settings-panel panel-surface status-panel">
          <h2>Current AI mode</h2>
          <div class="connection-banner ${statusTone}">
            <strong>${escapeHtml(statusTitle)}</strong>
            <p>${escapeHtml(state.connectionMessage || DEMO_AI_MESSAGE)}</p>
          </div>
          <div class="settings-actions">
            <button class="secondary-action" data-action="save-api-key">${icon("activity", 18)} Check connection</button>
            <button class="secondary-action" data-action="reset-demo">${icon("refresh-cw", 18)} Reset demo</button>
          </div>
        </section>

        <section class="settings-panel panel-surface">
          <h2>Vercel environment</h2>
          <p>For production, add this variable in Vercel too:</p>
          <pre>GEMINI_API_KEY=your_key
GEMINI_MODEL=${DEFAULT_GEMINI_MODEL}</pre>
        </section>

        <section class="settings-panel panel-surface">
          <h2>Student data</h2>
          <p>Notes and study progress are saved in this browser for the demo. Deploying to Vercel keeps the UI dynamic and the AI endpoint server-side.</p>
        </section>
      </div>
    </section>
  `;
}

function renderHistoryCompact(events) {
  const items = events.slice(0, 3);
  return `
    <section class="history-block">
      <div class="history-title">
        <div>${icon("clock-3", 21)} <strong>Recent activity</strong></div>
        <button data-action="nav" data-view="History">View all</button>
      </div>
      <div class="timeline">
        ${items
          .map(
            (event, index) => `
          <button class="history-row" data-action="nav" data-view="History">
            <span class="dot dot-${index}"></span>
            <span>
              <strong>${escapeHtml(event.task)} <em>${escapeHtml(event.provider)}</em></strong>
              <small>${escapeHtml(event.result)}</small>
            </span>
            <span>${formatDate(event.createdAt, "time")}</span>
            ${icon("chevron-right", 18)}
          </button>
        `
          )
          .join("") || `<div class="empty-state">${icon("history", 23)}<strong>No activity</strong><p>AI results appear here.</p></div>`}
      </div>
    </section>
  `;
}

function renderHistoryFull(events) {
  return `
    <article class="history-full">
      ${(events || [])
        .map(
          (event) => `
        <div class="history-detail">
          <strong>${escapeHtml(event.task)}</strong>
          <span>${escapeHtml(event.provider)} - ${formatDate(event.createdAt, "time")}</span>
          <p>${escapeHtml(event.result)}</p>
        </div>
      `
        )
        .join("") || `<div class="history-detail"><strong>No history yet</strong><p>Generate a summary or quiz to create a record.</p></div>`}
    </article>
  `;
}

function iconForEvent(task) {
  const label = String(task).toLowerCase();
  if (label.includes("quiz")) return "clipboard-list";
  if (label.includes("flash")) return "layers";
  if (label.includes("save")) return "save";
  if (label.includes("created")) return "file-plus-2";
  if (label.includes("test")) return "activity";
  return "sparkles";
}

function studyCardsFor(note) {
  const clean = firstSentence(note.content);
  const keyword = noteTitle(note).split(/\s+/).slice(0, 3).join(" ");
  return [
    {
      front: `What is the main idea of ${noteTitle(note)}?`,
      back: clean
    },
    {
      front: `Which course does this belong to?`,
      back: `${note.course}. Connect the answer to the course vocabulary when revising.`
    },
    {
      front: `What keyword should you define precisely?`,
      back: keyword
    },
    {
      front: "How can you prove you understood it?",
      back: `Create a small example about ${keyword} and explain each step without reading the note.`
    }
  ];
}

function revisionPlan() {
  const today = new Date();
  return state.notes.slice(0, 5).map((note, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const id = `${note.id}-${index}`;
    return {
      id,
      note,
      date: date.toISOString(),
      dayShort: date.toLocaleDateString([], { weekday: "short" }),
      dayNumber: date.getDate(),
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : `In ${index} days`,
      task: index % 2 === 0 ? "Review note + quiz" : "Flashcard recall",
      today: index === 0,
      done: state.completedSessions.includes(id)
    };
  });
}

function wireEvents() {
  root.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      const action = element.dataset.action;
      const handledAsync = await handleAction(action, element);
      if (!handledAsync) {
        persist();
        render();
      }
    });
  });

  root.querySelectorAll("[data-field]").forEach((element) => {
    element.addEventListener("input", () => handleField(element));
    element.addEventListener("change", () => handleField(element));
  });
}

async function handleAction(action, element) {
  state.notice = "";

  if (action === "open-nav") state.mobileNavOpen = true;
  if (action === "close-nav") state.mobileNavOpen = false;
  if (action === "open-notes-drawer") state.notesDrawerOpen = true;
  if (action === "close-notes-drawer") state.notesDrawerOpen = false;
  if (action === "nav") setView(element.dataset.view);
  if (action === "new-note") createNote();
  if (action === "select-note") selectNote(Number(element.dataset.id));
  if (action === "open-note") {
    selectNote(Number(element.dataset.id));
    state.view = "Dashboard";
  }
  if (action === "save-note") {
    addEvent(selectedNote().id, "Saved", "Local", "Changes saved");
    state.notice = "Note saved";
  }
  if (action === "pin-note") togglePin();
  if (action === "toggle-theme") state.theme = state.theme === "dark" ? "light" : "dark";
  if (action === "clear-panel") clearPanel();
  if (action === "reset-demo") resetDemo();
  if (action === "tab") state.activeTab = element.dataset.tab;
  if (action === "filter-course") {
    state.courseFilter = element.dataset.course;
    state.view = "Notes";
  }
  if (action === "course-quiz") {
    const firstCourseNote = state.notes.find((note) => note.course === element.dataset.course);
    if (firstCourseNote) {
      selectNote(firstCourseNote.id);
      await generate("quiz");
      return true;
    }
  }
  if (action === "copy-ai") copyAi();
  if (action === "task") state.assistantTask = element.dataset.task;
  if (action === "study-current-note") {
    state.studyNoteId = selectedNote().id;
    state.flashcardIndex = 0;
    state.flashcardFlipped = false;
    state.view = "Study Sets";
  }
  if (action === "study-note") {
    state.studyNoteId = Number(element.dataset.id);
    state.flashcardIndex = 0;
    state.flashcardFlipped = false;
    state.view = "Study Sets";
  }
  if (action === "flip-card") state.flashcardFlipped = !state.flashcardFlipped;
  if (action === "next-card") moveFlashcard(1);
  if (action === "prev-card") moveFlashcard(-1);
  if (action === "toggle-session") toggleSession(element.dataset.session);

  if (action === "generate-summary") {
    await generate("summary");
    return true;
  }
  if (action === "generate-quiz") {
    await generate("quiz");
    return true;
  }
  if (action === "generate-flashcards") {
    state.assistantTask = "flashcards";
    await generate("flashcards");
    return true;
  }
  if (action === "generate-assistant") {
    syncAssistantControls();
    await generate(state.assistantTask);
    return true;
  }
  if (action === "test-ai") {
    await testConnection();
    return true;
  }
  if (action === "save-api-key") {
    await testConnection();
    return true;
  }

  return false;
}

function handleField(element) {
  const field = element.dataset.field;
  if (field === "search") {
    state.search = element.value;
    render();
    return;
  }
  if (field === "course-filter") {
    state.courseFilter = element.value;
    render();
    return;
  }
  if (field === "selected-note") {
    selectNote(Number(element.value));
    render();
    return;
  }
  if (field === "assistant-task") state.assistantTask = element.value;
  if (field === "assistant-prompt") state.assistantPrompt = element.value;
  if (field === "api-key") {
    state.apiKey = element.value.trim();
    state.connectionStatus = state.apiKey ? "demo" : "demo";
    state.connectionMessage = state.apiKey ? "Save and test your key to activate Live AI." : DEMO_AI_MESSAGE;
    persist();
    return;
  }
  if (field === "course") updateSelectedNote({ course: element.value });
  if (field === "title") {
    updateSelectedNote({ title: element.value, autoTitle: !element.value.trim() });
    const titleText = root.querySelector(".editor-title h2");
    if (titleText) titleText.textContent = noteTitle(selectedNote());
  }
  if (field === "content") {
    const note = selectedNote();
    const nextTitle = note.autoTitle || isUntitledTitle(note.title) ? generatedNoteTitle({ ...note, content: element.value }) : note.title;
    updateSelectedNote({
      content: element.value,
      title: nextTitle,
      autoTitle: Boolean(note.autoTitle) || isUntitledTitle(note.title)
    });
    const wordCount = root.querySelector(".word-count");
    if (wordCount) wordCount.textContent = `${countWords(element.value)} words`;
    const titleText = root.querySelector(".editor-title h2");
    if (titleText) titleText.textContent = nextTitle;
  }
  persist();
}

function syncAssistantControls() {
  const prompt = root.querySelector("[data-field='assistant-prompt']");
  const selected = root.querySelector("[data-field='selected-note']");
  if (prompt) state.assistantPrompt = prompt.value;
  if (selected) state.selectedId = Number(selected.value);
}

function setView(view) {
  state.view = view || "Dashboard";
  state.mobileNavOpen = false;
  state.notesDrawerOpen = false;
}

function updateSelectedNote(patch) {
  const id = selectedNote().id;
  state.notes = state.notes.map((note) => (note.id === id ? ensureNoteTitle({ ...note, ...patch }) : note));
}

function selectNote(id) {
  state.selectedId = id;
  state.notesDrawerOpen = false;
  state.activeTab = "summary";
  state.aiResult = createMockResult(selectedNote(), "summary");
}

function createNote() {
  const nextId = Math.max(...state.notes.map((note) => note.id), 0) + 1;
  const note = {
    id: nextId,
    title: "",
    course: "C Programming",
    content: "",
    createdAt: new Date().toISOString(),
    pinned: false,
    autoTitle: true
  };
  state.notes = [ensureNoteTitle(note), ...state.notes];
  state.events = {
    ...state.events,
    [nextId]: [
      {
        id: `created-${Date.now()}`,
        task: "Note Created",
        provider: "Manual",
        createdAt: new Date().toISOString(),
        result: "Manually created"
      }
    ]
  };
  state.selectedId = nextId;
  state.view = "Dashboard";
  state.notice = "New note created";
}

function togglePin() {
  const note = selectedNote();
  state.notes = state.notes.map((item) => (item.id === note.id ? { ...item, pinned: !item.pinned } : item));
  state.notice = note.pinned ? "Note unpinned" : "Note pinned";
}

function addEvent(noteId, task, provider, result) {
  const newEvent = {
    id: `${task}-${Date.now()}`,
    task,
    provider,
    createdAt: new Date().toISOString(),
    result
  };
  state.events = {
    ...state.events,
    [noteId]: [newEvent, ...(state.events[noteId] || [])]
  };
}

async function generate(task) {
  state.activeTab = task === "quiz" ? "quiz" : "summary";
  state.isGenerating = true;
  state.notice = "";
  render();

  const note = selectedNote();
  const response = await requestAi(note, task);
  state.aiResult = response.output;
  state.provider = response.provider || "mock";
  state.apiMessage =
    response.message || (state.provider === "gemini" ? "Gemini response generated successfully." : DEMO_AI_MESSAGE);
  if (state.provider === "gemini") {
    state.connectionStatus = "success";
    state.connectionMessage = "Live AI is connected and ready.";
  }
  addEvent(note.id, taskMeta[task]?.label || "AI Result", state.provider, truncate(state.aiResult.body || state.aiResult.title, 90));
  state.isGenerating = false;
  state.notice = `${taskMeta[task]?.label || "AI result"} generated`;
  persist();
  render();
}

async function testConnection() {
  const hasBrowserKey = Boolean(state.apiKey.trim());
  state.connectionBusy = true;
  state.connectionStatus = "testing";
  state.connectionMessage = hasBrowserKey ? "Testing your Gemini key..." : "Testing server Gemini configuration...";
  state.notice = "";
  render();

  const response = await requestAi(
    {
      title: "Connection test",
      course: "Settings",
      content: "MemoCoach AI connection test."
    },
    "summary",
    { test: true }
  );
  state.provider = response.provider || "mock";
  const success = state.provider === "gemini" && response.ok !== false;
  const unconfigured = !hasBrowserKey && (response.message || DEMO_AI_MESSAGE) === DEMO_AI_MESSAGE;
  state.connectionStatus = success ? "success" : unconfigured ? "demo" : "error";
  state.connectionMessage = success ? "Success. Live AI is ready for summaries, quizzes, and flashcards." : (response.message || DEMO_AI_MESSAGE);
  state.apiMessage = state.connectionMessage;
  state.aiResult = response.output;
  state.connectionBusy = false;
  state.notice = success ? "Gemini key works" : unconfigured ? "Add an API key first" : "Gemini key failed";
  addEvent(selectedNote().id, "Connection Test", state.provider, state.connectionMessage);
  persist();
  render();
}

async function requestAi(note, task, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note,
        task,
        instruction: options.test ? "Return a short success response for connection testing." : state.assistantPrompt,
        apiKey: state.apiKey || "",
        test: Boolean(options.test)
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("AI endpoint unavailable");
    const payload = await response.json();
    return {
      output: payload.output || createMockResult(note, task),
      provider: payload.provider || "mock",
      message: payload.message || "",
      ok: payload.ok !== false
    };
  } catch {
    clearTimeout(timeout);
    return {
      output: createMockResult(note, task),
      provider: "mock",
      message: DEMO_AI_MESSAGE,
      ok: false
    };
  }
}

function clearPanel() {
  state.aiResult = {
    title: "AI Coach",
    body: "Choose Summary, Quiz, Explain, or Flashcards to create a new result.",
    keyIdea: "",
    revisionTip: ""
  };
  state.notice = "AI panel cleared";
}

function copyAi() {
  const text = `${state.aiResult?.title || "AI result"}\n\n${state.aiResult?.body || ""}`;
  navigator.clipboard?.writeText(text);
  state.notice = "AI output copied";
}

function moveFlashcard(direction) {
  const cards = studyCardsFor(selectedStudyNote());
  state.flashcardIndex = (state.flashcardIndex + direction + cards.length) % cards.length;
  state.flashcardFlipped = false;
}

function toggleSession(sessionId) {
  if (state.completedSessions.includes(sessionId)) {
    state.completedSessions = state.completedSessions.filter((id) => id !== sessionId);
    state.notice = "Session reopened";
  } else {
    state.completedSessions = [...state.completedSessions, sessionId];
    state.notice = "Session completed";
  }
}

function resetDemo() {
  state = {
    notes: seedNotes,
    events: seedEvents,
    selectedId: 1,
    studyNoteId: 1,
    flashcardIndex: 0,
    flashcardFlipped: false,
    completedSessions: [],
    theme: "light",
    view: "Dashboard",
    activeTab: "summary",
    search: "",
    courseFilter: "All courses",
    assistantTask: "summary",
    assistantPrompt: "",
    mobileNavOpen: false,
    notesDrawerOpen: false,
    isGenerating: false,
    connectionBusy: false,
    provider: "mock",
    apiMessage: DEMO_AI_MESSAGE,
    apiKey: "",
    connectionStatus: "demo",
    connectionMessage: DEMO_AI_MESSAGE,
    aiResult: createMockResult(seedNotes[0], "summary"),
    notice: "Demo reset"
  };
}

render();
