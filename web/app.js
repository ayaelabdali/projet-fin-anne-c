const STORAGE_KEY = "memocoach-web-state-v4";
const OLD_STORAGE_KEYS = ["memocoach-web-state-v3", "memocoach-web-state-v2", "memocoach-web-state-v1"];
const DEMO_AI_MESSAGE = "L'IA est en mode démo. Ajoute ta clé API pour activer les vrais résumés.";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

const seedNotes = [
  {
    id: 1,
    title: "Pointeurs en C",
    course: "Programmation C",
    content:
      "Les pointeurs sont des variables qui stockent des adresses mémoire au lieu de valeurs directes.\n\nEn C, un pointeur contient l'adresse d'une autre variable, et l'opérateur * permet d'accéder à la valeur située à cette adresse.\n\nL'opérateur & sert à obtenir l'adresse d'une variable.\n\nExemple :\nint x = 10;\nint *p = &x; // p stocke l'adresse de x\nprintf(\"%d\", *p); // affiche 10",
    createdAt: "2026-06-18T15:37:08Z",
    pinned: true
  },
  {
    id: 2,
    title: "Algorithme de recherche binaire",
    course: "Algorithmes",
    content:
      "La recherche binaire fonctionne sur des tableaux triés. Elle divise l'intervalle de recherche en deux jusqu'à trouver la valeur cible ou jusqu'à ce que l'intervalle devienne vide.",
    createdAt: "2026-06-17T10:20:00Z",
    pinned: false
  },
  {
    id: 3,
    title: "Normalisation des bases de données",
    course: "Bases de données",
    content:
      "La normalisation organise les données relationnelles pour réduire les doublons et éviter les anomalies de mise à jour. La première forme normale supprime les groupes répétitifs, la deuxième supprime les dépendances partielles et la troisième supprime les dépendances transitives.",
    createdAt: "2026-06-16T09:10:00Z",
    pinned: false
  },
  {
    id: 4,
    title: "Processus des systèmes d'exploitation",
    course: "Systèmes d'exploitation",
    content:
      "Un processus est un programme en cours d'exécution avec son propre espace d'adressage, ses registres, sa pile, son tas et son état d'exécution. L'ordonnanceur du système d'exploitation décide quel processus s'exécute ensuite.",
    createdAt: "2026-06-15T12:10:00Z",
    pinned: false
  },
  {
    id: 5,
    title: "Introduction à la programmation dynamique",
    course: "Algorithmes",
    content:
      "La programmation dynamique résout des problèmes en les divisant en sous-problèmes qui se chevauchent et en mémorisant les réponses pour éviter de les recalculer.",
    createdAt: "2026-06-14T15:00:00Z",
    pinned: false
  },
  {
    id: 6,
    title: "HTTP et API REST",
    course: "Développement web",
    content:
      "Les API REST exposent des ressources avec des URL et utilisent des méthodes HTTP comme GET, POST, PUT, PATCH et DELETE pour effectuer des actions.",
    createdAt: "2026-06-12T16:45:00Z",
    pinned: false
  },
  {
    id: 7,
    title: "Graphes et parcours BFS",
    course: "Structures de données",
    content:
      "Le parcours en largeur explore un graphe niveau par niveau avec une file. Il est utile pour trouver les plus courts chemins dans les graphes non pondérés.",
    createdAt: "2026-06-11T11:30:00Z",
    pinned: false
  }
];

const seedEvents = {
  1: [
    {
      id: "evt-quiz",
      task: "Quiz",
      provider: "Démo",
      createdAt: "2026-06-18T15:37:09Z",
      result: "3 questions générées"
    },
    {
      id: "evt-summary",
      task: "Résumé",
      provider: "Démo",
      createdAt: "2026-06-18T15:37:09Z",
      result: "Note résumée"
    },
    {
      id: "evt-created",
      task: "Note créée",
      provider: "Manual",
      createdAt: "2026-06-18T15:37:08Z",
      result: "Créée manuellement"
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

const viewLabels = {
  Dashboard: "Tableau de bord",
  Notes: "Notes",
  Courses: "Cours",
  "AI Tools": "Outils IA",
  History: "Historique",
  "Study Sets": "Fiches de révision",
  Calendar: "Calendrier",
  Settings: "Paramètres"
};

function providerLabel(provider) {
  const value = String(provider || "").toLowerCase();
  if (value === "gemini") return "Gemini";
  if (value === "manual") return "Manuel";
  if (value === "local") return "Local";
  if (value === "mock" || value === "démo" || value === "demo") return "Démo";
  return provider || "Démo";
}

const taskMeta = {
  summary: {
    label: "Résumé",
    icon: "list-checks",
    hint: "Condense la note en points de révision."
  },
  quiz: {
    label: "Quiz",
    icon: "clipboard-list",
    hint: "Génère des questions avec réponses courtes."
  },
  explain: {
    label: "Expliquer",
    icon: "messages-square",
    hint: "Explique le concept plus simplement."
  },
  flashcards: {
    label: "Cartes mémoire",
    icon: "layers",
    hint: "Crée des cartes recto-verso rapides."
  }
};

const root = document.getElementById("root");
const initialState = loadState();

let state = {
  ...initialState,
  view: "Dashboard",
  activeTab: "summary",
  search: "",
  courseFilter: "Tous les cours",
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
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  if (mode === "weekday") {
    return date.toLocaleDateString("fr-FR", { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" });
}

function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function firstSentence(text) {
  return String(text || "Cette note a besoin de plus de contenu.")
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
  return date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
}

function isUntitledTitle(title) {
  const clean = String(title || "").trim();
  return !clean || /^(untitled note|note sans titre)$/i.test(clean);
}

function generatedNoteTitle(note) {
  const words = String(note?.content || "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) return words.slice(0, 5).join(" ");
  return `Note du ${formatMonthDay(note?.createdAt || new Date().toISOString())}`;
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
  return ["Tous les cours", ...Array.from(new Set(state.notes.map((note) => note.course || "Général")))];
}

function filteredNotes() {
  return state.notes.filter((note) => {
    const matchesCourse = state.courseFilter === "Tous les cours" || note.course === state.courseFilter;
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
        noteTitle: note ? noteTitle(note) : "Note inconnue",
        course: note?.course || "Général"
      }));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function courseSummaries() {
  return getCourses()
    .filter((course) => course !== "Tous les cours")
    .map((course) => {
      const notes = state.notes.filter((note) => note.course === course);
      const wordCount = notes.reduce((total, note) => total + countWords(note.content), 0);
      const aiCount = notes.reduce((total, note) => total + (state.events[note.id] || []).filter((event) => event.provider !== "Manual" && event.provider !== "Manuel").length, 0);
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
        "1. Quelle est l'idée centrale de cette note ?",
        "2. Quel terme ou mécanisme faut-il définir précisément ?",
        `3. Donne un exemple pratique basé sur : ${clean}.`
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
        `Verso : ${clean}.`,
        "Recto : Quel exemple peut prouver que tu as compris ?",
        "Verso : Crée un petit exemple et explique chaque étape."
      ].join("\n"),
      keyIdea: "Les cartes mémoire doivent rester assez courtes pour être révisées vite.",
      revisionTip: "Révise une fois aujourd'hui, une fois demain, puis une fois avant l'examen."
    };
  }

  if (task === "explain") {
    return {
      title: "Explication",
      body: `${clean}. En termes simples, identifie le concept, explique pourquoi il compte, puis relie-le à un exemple concret.`,
      keyIdea: "Les explications simples sont plus faciles à défendre pendant la présentation.",
      revisionTip: "Essaie de l'expliquer à voix haute en moins d'une minute."
    };
  }

  return {
    title: "Résumé",
    body: `${clean}.`,
    keyIdea:
      note?.course === "Programmation C"
        ? "Les pointeurs permettent un accès et une manipulation efficaces de la mémoire en C."
        : "Concentre-toi sur la définition, la règle et un petit exemple.",
    revisionTip: "Réécris cette note en trois points et teste-toi avec un exemple."
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
      course: String(note.course || "").trim() || "Général",
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
      ${state.mobileNavOpen ? `<button class="nav-scrim" data-action="close-nav" aria-label="Fermer la navigation">${icon("x", 24)}</button>` : ""}
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
          <small>Révise mieux, retiens plus</small>
        </div>
      </div>

      <nav class="nav-list" aria-label="Navigation principale">
        ${navItems
          .map(
            ([label, iconName]) => `
          <button class="${state.view === label ? "active" : ""}" data-action="nav" data-view="${escapeHtml(label)}" aria-current="${state.view === label ? "page" : "false"}">
            ${icon(iconName, 22)}
            <span>${escapeHtml(viewLabels[label] || label)}</span>
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
          <span>Données enregistrées dans le navigateur</span>
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
      <button class="icon-button mobile-menu" data-action="open-nav" aria-label="Ouvrir la navigation">${icon("menu", 22)}</button>
      <div class="top-title">
        ${icon(nav[1], 23)}
        <strong>${escapeHtml(viewLabels[state.view] || state.view)}</strong>
      </div>
      <div class="top-actions">
        <button class="status-pill ${live ? "live" : "demo"}" data-action="nav" data-view="Settings">
          <span class="status-dot" aria-hidden="true"></span>
          ${live ? "IA en direct" : "Mode démo"}
        </button>
        <button class="icon-button" data-action="toggle-theme" aria-label="Changer le thème">${icon(state.theme === "dark" ? "sun" : "moon", 21)}</button>
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
          <span class="eyebrow">${icon("sparkles", 16)} Poste de révision étudiant</span>
          <h1>Transforme tes notes de cours en supports de révision.</h1>
          <p>Écris tes notes, génère des quiz, révise avec des cartes mémoire et garde chaque résultat IA dans un espace local.</p>
          <div class="hero-actions">
            <button class="primary-action" data-action="generate-summary">${icon("sparkles", 18)} Résumer la note actuelle</button>
            <button class="secondary-action" data-action="nav" data-view="Study Sets">${icon("layers", 18)} Commencer la révision</button>
          </div>
        </div>
      </div>

      <div class="metric-strip" aria-label="Indicateurs de révision">
        ${renderMetric("Notes", state.notes.length, "file-text", "blue")}
        ${renderMetric("Cours", getCourses().length - 1, "book-open", "green")}
        ${renderMetric("Mots", words, "text", "amber")}
        ${renderMetric("Actions IA", events.filter((event) => event.provider !== "Manual" && event.provider !== "Manuel").length, "wand-sparkles", "violet")}
      </div>

      <button class="notes-drawer-trigger" data-action="open-notes-drawer">${icon("menu", 18)} Liste des notes</button>
      <div class="dashboard-grid">
        ${renderNotesPane()}
        ${renderEditorPane()}
        ${renderAssistantPane(state.events[note.id] || [])}
      </div>
      ${state.notesDrawerOpen ? `<button class="notes-drawer-scrim" data-action="close-notes-drawer" aria-label="Fermer la liste des notes"></button>` : ""}
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
        <button class="new-note" data-action="new-note">${icon("plus", 20)} Nouvelle note</button>
        <button class="tool-button" data-action="pin-note" aria-label="Épingler la note sélectionnée">${icon(note.pinned ? "pin-off" : "pin", 20)}</button>
        <label class="search-box">
          ${icon("search", 19)}
          <input data-field="search" value="${escapeHtml(state.search)}" placeholder="Rechercher des notes" />
        </label>
      </div>

      <div class="notes-heading">
        <span>Notes (${visibleNotes.length})</span>
        <select data-field="course-filter" aria-label="Filtrer par cours">
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
              <small>${escapeHtml(item.course)} - ${countWords(item.content)} mots</small>
            </span>
            <span class="note-meta">
              ${item.pinned ? icon("pin", 16) : icon("chevron-right", 16)}
              <small>${formatDate(item.createdAt, "weekday")}</small>
            </span>
          </button>
        `
          )
          .join("") || `<div class="empty-state">${icon("search", 24)}<strong>Aucune note trouvée</strong><p>Essaie un autre cours ou un autre mot-clé.</p></div>`}
      </div>
    </section>
  `;
}

function renderEditorPane() {
  const note = selectedNote();
  const courses = getCourses().filter((course) => course !== "Tous les cours");
  return `
    <section class="editor-pane panel-surface">
      <div class="editor-header">
        <div class="editor-title">
          ${icon("notebook-pen", 22)}
          <div>
            <h2>${escapeHtml(noteTitle(note))}</h2>
            <small>${escapeHtml(note.course)} - ${countWords(note.content)} mots</small>
          </div>
        </div>
        <div class="editor-actions">
          <button class="save-button" data-action="save-note">${icon("check", 18)} Enregistrer</button>
          <button class="icon-button" data-action="pin-note" aria-label="Épingler la note">${icon(note.pinned ? "pin-off" : "pin", 20)}</button>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="course">Cours</label>
          <select id="course" data-field="course">
            ${courses.map((course) => `<option value="${escapeHtml(course)}" ${course === note.course ? "selected" : ""}>${escapeHtml(course)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="title">Titre</label>
          <input id="title" data-field="title" value="${escapeHtml(note.autoTitle || isUntitledTitle(note.title) ? "" : note.title)}" placeholder="${escapeHtml(noteTitle(note))}" />
        </div>
      </div>

      <div class="field editor-field">
        <label for="content">Contenu</label>
        <div class="format-bar">
          <button aria-label="Gras" title="Gras"><strong>B</strong></button>
          <button aria-label="Italique" title="Italique"><span class="italic">I</span></button>
          <button aria-label="Souligné" title="Souligné"><span class="underline">U</span></button>
          <button aria-label="Liste à puces" title="Liste">${icon("list", 17)}</button>
          <button aria-label="Code" title="Code">${icon("code-2", 17)}</button>
          <button aria-label="Annuler" title="Annuler">${icon("undo-2", 17)}</button>
        </div>
        <textarea id="content" data-field="content">${escapeHtml(note.content)}</textarea>
      </div>

      <div class="editor-status">
        <span>${note.pinned ? "Épinglée pour révision" : "Prête à réviser"}</span>
        <span class="word-count">${countWords(note.content)} mots</span>
      </div>

      <div class="editor-cta">
        <button class="primary-action" data-action="generate-summary" ${state.isGenerating ? "disabled" : ""}>${icon("sparkles", 18)} Résumé</button>
        <button class="dark-action" data-action="generate-quiz" ${state.isGenerating ? "disabled" : ""}>${icon("clipboard-list", 18)} Quiz</button>
        <button class="secondary-action" data-action="study-current-note">${icon("layers", 18)} Réviser</button>
        <button class="ghost-action" data-action="clear-panel">${icon("eraser", 18)} Effacer</button>
      </div>
    </section>
  `;
}

function renderAssistantPane(events) {
  return `
    <section class="assistant-pane panel-surface">
      <div class="assistant-header">
        <div>${icon("sparkles", 22)} <strong>Coach IA</strong></div>
        <span class="provider-chip ${state.provider === "gemini" ? "live" : ""}">${state.provider === "gemini" ? "Gemini" : "Démo"}</span>
      </div>

      <div class="tabs" role="tablist" aria-label="Résultat IA">
        ${[
          ["summary", "ti-file-text", "Résumé"],
          ["quiz", "ti-question-mark", "Quiz"],
          ["history", "ti-clock", "Historique"]
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
          <span class="eyebrow">${icon(state.provider === "gemini" ? "sparkles" : "cpu", 15)} ${state.provider === "gemini" ? "Résultat Gemini" : "Résultat démo"}</span>
          <h2>${state.isGenerating ? "Génération..." : escapeHtml(result.title)}</h2>
        </div>
        <button class="icon-button" data-action="copy-ai" aria-label="Copier le résultat">${icon("copy", 19)}</button>
      </div>
      <p class="ai-body">${escapeHtml(state.isGenerating ? "Contact de l'assistant IA et préparation de ton résultat..." : result.body)}</p>
      ${result.keyIdea ? `<div class="divider"></div><h3>Idée clé</h3><p>${escapeHtml(result.keyIdea)}</p>` : ""}
      ${result.revisionTip ? `<h3>Conseil de révision</h3><p>${escapeHtml(result.revisionTip)}</p>` : ""}
      <footer>
        <span>${escapeHtml(providerLabel(state.provider))} - ${formatDate(new Date().toISOString())}</span>
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
          <span class="eyebrow">${icon("file-text", 16)} Bibliothèque</span>
          <h1>Bibliothèque de notes</h1>
          <p>Recherche, modifie et envoie n'importe quelle note vers le coach IA ou les fiches de révision.</p>
        </div>
        <button class="new-note" data-action="new-note">${icon("plus", 20)} Nouvelle note</button>
      </div>

      <div class="control-row">
        <label class="search-box wide">${icon("search", 20)}<input data-field="search" value="${escapeHtml(state.search)}" placeholder="Rechercher des notes" /></label>
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
              <span>${countWords(note.content)} mots</span>
              <button data-action="open-note" data-id="${note.id}">${icon("pen-line", 17)} Ouvrir</button>
            </div>
          </article>
        `
          )
          .join("") || `<div class="empty-state wide-state">${icon("search", 28)}<strong>Aucune note correspondante</strong><p>Ajuste le filtre et la bibliothèque se mettra à jour.</p></div>`}
      </div>
    </section>
  `;
}

function renderCoursesView() {
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("book-open", 16)} Carte des cours</span>
          <h1>Cours</h1>
          <p>Suis chaque cours par notes, activité IA, progression et prochain élément à réviser.</p>
        </div>
      </div>
      <div class="course-grid">
        ${courseSummaries()
          .map(
            (summary) => `
          <article class="course-card">
            <div class="course-card-top">
              <span>${icon("book-open", 24)}</span>
              <small>${summary.notes.length} notes - ${summary.wordCount} mots</small>
            </div>
            <h2>${escapeHtml(summary.course)}</h2>
            <p>${escapeHtml(summary.latest ? truncate(summary.latest.content, 96) : "Aucune note pour le moment.")}</p>
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
          <span class="eyebrow">${icon("wand-sparkles", 16)} Studio assistant</span>
          <h1>Outils IA</h1>
          <p>Choisis une note, sélectionne une tâche, ajoute des consignes d'examen, puis génère un résultat enregistré.</p>
        </div>
        <span class="provider-chip ${state.provider === "gemini" ? "live" : ""}">${state.provider === "gemini" ? "Gemini en direct" : "Mode démo"}</span>
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
            <label>Note sélectionnée</label>
            <select data-field="selected-note">
              ${state.notes.map((item) => `<option value="${item.id}" ${item.id === note.id ? "selected" : ""}>${escapeHtml(noteTitle(item))}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Instruction supplémentaire</label>
            <textarea class="short-textarea" data-field="assistant-prompt" placeholder="Exemple : fais court, concentre-toi sur l'examen ou ajoute des exemples.">${escapeHtml(state.assistantPrompt)}</textarea>
          </div>
          <button class="primary-action full-width" data-action="generate-assistant" ${state.isGenerating ? "disabled" : ""}>${icon("sparkles", 19)} Lancer l'assistant IA</button>
        </section>

        <section class="tool-output panel-surface">
          ${renderAiCard()}
          <div class="output-actions">
            <button class="secondary-action" data-action="copy-ai">${icon("copy", 18)} Copier</button>
            <button class="secondary-action" data-action="nav" data-view="History">${icon("history", 18)} Historique</button>
            <button class="secondary-action" data-action="nav" data-view="Study Sets">${icon("layers", 18)} Fiches</button>
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
          <span class="eyebrow">${icon("history", 16)} Activité</span>
          <h1>Historique</h1>
          <p>Consulte chaque génération, sauvegarde, test et événement de note dans un seul fil d'activité.</p>
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
                <span class="provider-chip compact ${String(event.provider).toLowerCase() === "gemini" ? "live" : ""}">${escapeHtml(providerLabel(event.provider))}</span>
              </div>
              <p>${escapeHtml(event.noteTitle)} - ${escapeHtml(event.course)}</p>
              <small>${escapeHtml(event.result)} - ${formatDate(event.createdAt, "time")}</small>
            </div>
            <button class="icon-button" data-action="open-note" data-id="${event.noteId}" aria-label="Ouvrir la note">${icon("arrow-right", 19)}</button>
          </article>
        `
          )
          .join("") || `<div class="empty-state wide-state">${icon("history", 28)}<strong>Aucune activité pour le moment</strong><p>Génère un résultat pour créer ton premier élément d'historique.</p></div>`}
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
            <span class="eyebrow">${icon("layers", 16)} Rappel actif</span>
            <h1>Fiches de révision</h1>
            <p>Génère des cartes mémoire à partir de tes notes quand tu es prêt à réviser.</p>
          </div>
        </div>
        <article class="study-empty-card panel-surface">
          <i class="ti ti-cards" aria-hidden="true"></i>
          <h2>Aucune fiche pour le moment</h2>
          <p>Crée d'abord une note, puis génère des cartes mémoire pour le rappel actif.</p>
          <button class="primary-action" data-action="new-note">Créer une première fiche depuis une note ${icon("arrow-right", 17)}</button>
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
          <span class="eyebrow">${icon("layers", 16)} Rappel actif</span>
          <h1>Fiches de révision</h1>
          <p>Choisis un paquet, retourne les cartes et avance dans la session comme dans un vrai outil de révision.</p>
        </div>
        <button class="primary-action" data-action="generate-flashcards">${icon("sparkles", 18)} Générer des cartes</button>
      </div>

      <div class="study-grid">
        <section class="deck-list">
          ${state.notes
            .map(
              (item) => `
            <article class="study-set-card ${item.id === note.id ? "active" : ""}">
              <div class="card-count-badge">
                <strong>${studyCardsFor(item).length}</strong>
                <span>cartes</span>
              </div>
              <div class="study-card-body">
                <span class="course-tag">${escapeHtml(item.course)}</span>
                <h2>${escapeHtml(noteTitle(item))}</h2>
                <p>${escapeHtml(truncate(item.content, 40))}</p>
              </div>
              <button class="start-review" data-action="study-note" data-id="${item.id}">Commencer <span aria-hidden="true">&rarr;</span></button>
            </article>
          `
            )
            .join("")}
        </section>

        <section class="flashcard-panel panel-surface">
          <div class="flashcard-head">
            <div>
              <h2>${escapeHtml(noteTitle(note))}</h2>
              <p>${escapeHtml(note.course)} - carte ${index + 1} sur ${cards.length}</p>
            </div>
            <div class="progress-ring">${Math.round(((index + 1) / cards.length) * 100)}%</div>
          </div>
          <button class="flashcard ${state.flashcardFlipped ? "flipped" : ""}" data-action="flip-card">
            <span>${state.flashcardFlipped ? "Verso" : "Recto"}</span>
            <strong>${escapeHtml(state.flashcardFlipped ? card.back : card.front)}</strong>
          </button>
          <div class="flashcard-actions">
            <button class="secondary-action" data-action="prev-card">${icon("arrow-left", 18)} Précédente</button>
            <button class="dark-action" data-action="flip-card">${icon("rotate-3d", 18)} Retourner</button>
            <button class="secondary-action" data-action="next-card">Suivante ${icon("arrow-right", 18)}</button>
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
          <span class="eyebrow">${icon("calendar-days", 16)} Plan de révision</span>
          <h1>Calendrier</h1>
          <p>Planifie de courtes sessions et marque-les comme terminées pendant tes révisions.</p>
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
              <button class="session-check" data-action="toggle-session" data-session="${session.id}" aria-label="Basculer la session">${icon(session.done ? "check" : "circle", 20)}</button>
              <div>
                <small>${escapeHtml(session.label)} - ${formatDate(session.date, "weekday")}</small>
                <h2>${escapeHtml(noteTitle(session.note))}</h2>
                <p>${escapeHtml(session.note.course)}</p>
              </div>
              <span class="session-date">${formatDate(session.date, "weekday")}</span>
              <span class="session-task">${escapeHtml(session.task)}</span>
              <button class="secondary-action" data-action="study-note" data-id="${session.note.id}">${icon("layers", 17)} Réviser</button>
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
  const statusTitle = state.connectionStatus === "success" ? "L'IA est connectée" : state.connectionStatus === "error" ? "Connexion échouée" : state.connectionStatus === "testing" ? "Vérification de la connexion" : "Mode démo";
  return `
    <section class="page-view">
      <div class="page-heading">
        <div>
          <span class="eyebrow">${icon("settings", 16)} Configuration du projet</span>
          <h1>Paramètres</h1>
          <p>Ajoute ta clé Gemini dans Vercel, ou colle-la ici une seule fois pour une démo locale.</p>
        </div>
      </div>

      <div class="settings-grid">
        <section class="settings-panel api-setup-card panel-surface">
          <h2>Connecter Gemini</h2>
          <div class="setup-steps">
            <div><strong>1</strong><span>Récupère ta clé gratuite sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a></span></div>
            <div><strong>2</strong><span>Copie-la puis colle-la ci-dessous</span></div>
            <div><strong>3</strong><span>Enregistre - l'IA s'activera immédiatement</span></div>
          </div>
          <div class="api-key-row">
            <label for="api-key">Clé API Gemini</label>
            <div>
              <input id="api-key" type="text" data-field="api-key" value="${escapeHtml(state.apiKey)}" placeholder="Colle GEMINI_API_KEY ici" autocomplete="off" spellcheck="false" />
              <button class="primary-action" data-action="save-api-key" ${state.connectionBusy ? "disabled" : ""}>${state.connectionBusy ? "Test..." : "Enregistrer et tester"}</button>
            </div>
          </div>
          <p class="settings-note">Modèle par défaut : <code>${DEFAULT_GEMINI_MODEL}</code>, avec des modèles Gemini Flash récents en secours côté serveur.</p>
        </section>

        <section class="settings-panel panel-surface status-panel">
          <h2>Mode IA actuel</h2>
          <div class="connection-banner ${statusTone}">
            <strong>${escapeHtml(statusTitle)}</strong>
            <p>${escapeHtml(state.connectionMessage || DEMO_AI_MESSAGE)}</p>
          </div>
          <div class="settings-actions">
            <button class="secondary-action" data-action="save-api-key">${icon("activity", 18)} Vérifier la connexion</button>
            <button class="secondary-action" data-action="reset-demo">${icon("refresh-cw", 18)} Réinitialiser la démo</button>
          </div>
        </section>

        <section class="settings-panel panel-surface">
          <h2>Environnement Vercel</h2>
          <p>Pour la production, ajoute aussi cette variable dans Vercel :</p>
          <pre>GEMINI_API_KEY=your_key
GEMINI_MODEL=${DEFAULT_GEMINI_MODEL}</pre>
        </section>

        <section class="settings-panel panel-surface">
          <h2>Données étudiant</h2>
          <p>Les notes et la progression sont enregistrées dans ce navigateur pour la démo. Le déploiement Vercel garde l'interface dynamique et l'endpoint IA côté serveur.</p>
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
        <div>${icon("clock-3", 21)} <strong>Activité récente</strong></div>
        <button data-action="nav" data-view="History">Tout voir</button>
      </div>
      <div class="timeline">
        ${items
          .map(
            (event, index) => `
          <button class="history-row" data-action="nav" data-view="History">
            <span class="dot dot-${index}"></span>
            <span>
              <strong>${escapeHtml(event.task)} <em>${escapeHtml(providerLabel(event.provider))}</em></strong>
              <small>${escapeHtml(event.result)}</small>
            </span>
            <span>${formatDate(event.createdAt, "time")}</span>
            ${icon("chevron-right", 18)}
          </button>
        `
          )
          .join("") || `<div class="empty-state">${icon("history", 23)}<strong>Aucune activité</strong><p>Les résultats IA apparaissent ici.</p></div>`}
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
          <span>${escapeHtml(providerLabel(event.provider))} - ${formatDate(event.createdAt, "time")}</span>
          <p>${escapeHtml(event.result)}</p>
        </div>
      `
        )
        .join("") || `<div class="history-detail"><strong>Aucun historique</strong><p>Génère un résumé ou un quiz pour créer une entrée.</p></div>`}
    </article>
  `;
}

function iconForEvent(task) {
  const label = String(task).toLowerCase();
  if (label.includes("quiz")) return "clipboard-list";
  if (label.includes("flash")) return "layers";
  if (label.includes("save") || label.includes("enregistr")) return "save";
  if (label.includes("created") || label.includes("créée") || label.includes("cree")) return "file-plus-2";
  if (label.includes("test")) return "activity";
  return "sparkles";
}

function studyCardsFor(note) {
  const clean = firstSentence(note.content);
  const keyword = noteTitle(note).split(/\s+/).slice(0, 3).join(" ");
  return [
    {
      front: `Quelle est l'idée principale de ${noteTitle(note)} ?`,
      back: clean
    },
    {
      front: "À quel cours cette note appartient-elle ?",
      back: `${note.course}. Relie la réponse au vocabulaire du cours pendant la révision.`
    },
    {
      front: "Quel mot-clé dois-tu définir précisément ?",
      back: keyword
    },
    {
      front: "Comment peux-tu prouver que tu as compris ?",
      back: `Crée un petit exemple sur ${keyword} et explique chaque étape sans relire la note.`
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
      dayShort: date.toLocaleDateString("fr-FR", { weekday: "short" }),
      dayNumber: date.getDate(),
      label: index === 0 ? "Aujourd'hui" : index === 1 ? "Demain" : `Dans ${index} jours`,
      task: index % 2 === 0 ? "Réviser la note + quiz" : "Rappel avec cartes mémoire",
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
    addEvent(selectedNote().id, "Enregistrée", "Local", "Modifications enregistrées");
    state.notice = "Note enregistrée";
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
    state.connectionMessage = state.apiKey ? "Enregistre et teste ta clé pour activer l'IA en direct." : DEMO_AI_MESSAGE;
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
    if (wordCount) wordCount.textContent = `${countWords(element.value)} mots`;
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
    course: "Programmation C",
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
        task: "Note créée",
        provider: "Manuel",
        createdAt: new Date().toISOString(),
        result: "Créée manuellement"
      }
    ]
  };
  state.selectedId = nextId;
  state.view = "Dashboard";
  state.notice = "Nouvelle note créée";
}

function togglePin() {
  const note = selectedNote();
  state.notes = state.notes.map((item) => (item.id === note.id ? { ...item, pinned: !item.pinned } : item));
  state.notice = note.pinned ? "Note désépinglée" : "Note épinglée";
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
    response.message || (state.provider === "gemini" ? "Réponse Gemini générée avec succès." : DEMO_AI_MESSAGE);
  if (state.provider === "gemini") {
    state.connectionStatus = "success";
    state.connectionMessage = "L'IA en direct est connectée et prête.";
  }
  addEvent(note.id, taskMeta[task]?.label || "Résultat IA", state.provider, truncate(state.aiResult.body || state.aiResult.title, 90));
  state.isGenerating = false;
  state.notice = `${taskMeta[task]?.label || "Résultat IA"} généré`;
  persist();
  render();
}

async function testConnection() {
  const hasBrowserKey = Boolean(state.apiKey.trim());
  state.connectionBusy = true;
  state.connectionStatus = "testing";
  state.connectionMessage = hasBrowserKey ? "Test de ta clé Gemini..." : "Test de la configuration Gemini du serveur...";
  state.notice = "";
  render();

  const response = await requestAi(
    {
      title: "Test de connexion",
      course: "Paramètres",
      content: "Test de connexion MemoCoach AI."
    },
    "summary",
    { test: true }
  );
  state.provider = response.provider || "mock";
  const success = state.provider === "gemini" && response.ok !== false;
  const unconfigured = !hasBrowserKey && (response.message || DEMO_AI_MESSAGE) === DEMO_AI_MESSAGE;
  state.connectionStatus = success ? "success" : unconfigured ? "demo" : "error";
  state.connectionMessage = success ? "Succès. L'IA en direct est prête pour les résumés, les quiz et les cartes mémoire." : (response.message || DEMO_AI_MESSAGE);
  state.apiMessage = state.connectionMessage;
  state.aiResult = response.output;
  state.connectionBusy = false;
  state.notice = success ? "La clé Gemini fonctionne" : unconfigured ? "Ajoute d'abord une clé API" : "La clé Gemini a échoué";
  addEvent(selectedNote().id, "Test de connexion", state.provider, state.connectionMessage);
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
        instruction: options.test ? "Réponds brièvement que la connexion fonctionne." : state.assistantPrompt,
        apiKey: state.apiKey || "",
        test: Boolean(options.test)
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error("Endpoint IA indisponible");
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
    title: "Coach IA",
    body: "Choisis Résumé, Quiz, Expliquer ou Cartes mémoire pour créer un nouveau résultat.",
    keyIdea: "",
    revisionTip: ""
  };
  state.notice = "Panneau IA effacé";
}

function copyAi() {
  const text = `${state.aiResult?.title || "Résultat IA"}\n\n${state.aiResult?.body || ""}`;
  navigator.clipboard?.writeText(text);
  state.notice = "Résultat IA copié";
}

function moveFlashcard(direction) {
  const cards = studyCardsFor(selectedStudyNote());
  state.flashcardIndex = (state.flashcardIndex + direction + cards.length) % cards.length;
  state.flashcardFlipped = false;
}

function toggleSession(sessionId) {
  if (state.completedSessions.includes(sessionId)) {
    state.completedSessions = state.completedSessions.filter((id) => id !== sessionId);
    state.notice = "Session rouverte";
  } else {
    state.completedSessions = [...state.completedSessions, sessionId];
    state.notice = "Session terminée";
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
    courseFilter: "Tous les cours",
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
    notice: "Démo réinitialisée"
  };
}

render();
