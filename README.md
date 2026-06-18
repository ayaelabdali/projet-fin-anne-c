# MemoCoach AI

MemoCoach AI is a study assistant for semester projects. It includes a Vercel-ready web interface for students and a C-first core demo that stores course notes in SQLite, then generates summaries or quiz questions through an external AI REST API.

The app is designed for the ESISA end-of-semester C project constraints: a C backend, local SQLite storage, API-based AI integration, automated tests, professional documentation, and a reproducible demo path.

## Features

- Add, list, and inspect course notes from a terminal frontend.
- Use a dynamic Vercel-ready dashboard for notes, courses, AI tools, history, study sets, calendar, and settings.
- Store notes and AI outputs in `data/local.db` using SQLite.
- Generate summaries, quizzes, explanations, and flashcards through Gemini on Vercel.
- Run in offline mock mode for demos and automated tests when no API key is available.
- Keep backend concerns separated: database, AI client, JSON helpers, and CLI frontend live in separate modules.

## Repository Structure

```text
.
|- include/memocoach/      # Public C headers
|- src/                    # C implementation
|- web/                    # Dynamic web interface
|- api/                    # Vercel serverless Gemini API route
|- tests/                  # C unit/integration tests
|- docs/                   # Architecture, API, and demo notes
|- deploy/                 # Docker and Itch.io packaging notes
|- scripts/                # Developer scripts
|- data/                   # Local SQLite database folder
`- .github/workflows/      # Continuous integration
```

## Requirements

For the web interface:

- Node.js 20+
- npm, no package installation needed for the local static build

For the C core:

- C compiler with C11 support: `gcc`, `clang`, or MSVC-compatible equivalent
- SQLite development library
- `curl` executable for live AI API calls
- `make` for the default build workflow

## Web App

Run the dynamic graphic interface:

```bash
npm run dev
```

Build for Vercel:

```bash
npm run build
```

The site stores notes in the browser for local demos and calls `/api/ai` when Gemini environment variables are configured. Without a Gemini key, it uses mock output so the demo still works.

For real Gemini AI on Vercel, add:

```text
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.0-flash-lite
```

See [docs/vercel-deployment.md](docs/vercel-deployment.md).

## C Core Build

On Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y build-essential sqlite3 libsqlite3-dev curl
```

On Windows, install MSYS2 or another GCC distribution, then install SQLite development files and make sure `gcc`, `make`, `curl`, and SQLite headers/libs are on PATH.

In this local Windows workspace, `scripts/run-tests.ps1` can also auto-detect the Dev-C++ GCC installation and download the SQLite amalgamation into the ignored `build/deps` folder.

Build the C executable:

```bash
make build
```

The executable is created at:

```text
bin/memocoach
```

You can also use CMake:

```bash
cmake -S . -B build
cmake --build build
```

## Configuration

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Important variables:

```bash
MEMOCOACH_DB=data/local.db
MEMOCOACH_AI_MOCK=1
AI_PROVIDER_URL=https://your-provider.example/v1/chat/completions
AI_API_KEY=replace-with-your-key
AI_MODEL=gemini-2.0-flash-lite
GEMINI_API_KEY=replace-with-your-gemini-key
GEMINI_MODEL=gemini-2.0-flash-lite
```

Use `MEMOCOACH_AI_MOCK=1` for offline demos. Remove it or set it to `0` when testing a real provider.

## Run

Initialize the local database:

```bash
./bin/memocoach init
```

Add a note:

```bash
./bin/memocoach add --course "C Programming" --title "Pointers" --content "Pointers store memory addresses. They are declared with * and read with the dereference operator."
```

List notes:

```bash
./bin/memocoach list
```

Summarize a note:

```bash
./bin/memocoach summarize 1
```

Generate quiz questions:

```bash
./bin/memocoach quiz 1
```

View stored AI outputs:

```bash
./bin/memocoach history 1
```

## Tests

```bash
make test
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-tests.ps1
```

Build the Windows executable with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

The CI workflow in `.github/workflows/ci.yml` compiles the project and runs the tests on Ubuntu.

## AI Integration

The web app calls Gemini from the Vercel serverless route in `api/ai.js`. The C core can still call an OpenAI-compatible endpoint through `curl`, parse the response in C, and store it in SQLite.

See [docs/api.md](docs/api.md) for request examples, environment variables, and error-handling behavior.

## Architecture

The terminal frontend is intentionally thin. It parses commands and delegates work to independent backend modules:

- `db.c`: SQLite schema and persistence
- `ai_client.c`: API request building, curl execution, mock fallback
- `json_utils.c`: JSON escaping and response extraction
- `util.c`: small filesystem, time, and memory helpers

See [docs/architecture.md](docs/architecture.md) for the full diagram.

## Deployment And Demo

This project is now a Vercel web app with a C core demo. Deploy the web app to Vercel, then show the C executable during the technical defense.

See:

- [deploy/itchio.md](deploy/itchio.md)
- [docs/demo-script.md](docs/demo-script.md)

Final presentation links to add before submission:

- Public repository: `https://github.com/chafik-boulealam-lab/project-<group>-memocoach-ai`
- Demo video: add the final 5-10 minute recording link after publishing.
- LinkedIn post: add the team post link after publishing.
- Itch.io or release page: add the public package URL after uploading the build.

## Team

Replace this section with group members and roles:

| Member | Role |
|---|---|
| Member 1 | C backend and SQLite |
| Member 2 | AI API integration |
| Member 3 | Tests, CI, and documentation |
| Member 4 | Demo, packaging, and presentation |

## Safety

Never commit API keys. Store secrets in local environment variables, GitHub Secrets, or deployment dashboard variables.
