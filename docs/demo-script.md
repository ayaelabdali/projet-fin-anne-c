# Demo Script

Target duration: 5 to 10 minutes.

## 1. Introduction

Present MemoCoach AI as a study assistant that helps students convert notes into summaries and quiz questions.

## 2. Architecture

Show [docs/architecture.md](architecture.md), emphasizing:

- C backend modules
- SQLite local database
- AI REST API integration
- Offline mock mode for reliable demos

## 3. Build And Test

```bash
make test
make build
```

Explain that CI runs the same tests on GitHub Actions.

## 4. Live Demo

```bash
export MEMOCOACH_AI_MOCK=1
./bin/memocoach init
./bin/memocoach add --course "C Programming" --title "Pointers" --content "Pointers store memory addresses. They are declared with * and dereferenced to access values."
./bin/memocoach list
./bin/memocoach show 1
./bin/memocoach summarize 1
./bin/memocoach quiz 1
./bin/memocoach history 1
```

If API credentials are available, repeat `summarize` with:

```bash
export MEMOCOACH_AI_MOCK=0
export AI_PROVIDER_URL="https://api.example.com/v1/chat/completions"
export AI_API_KEY="..."
export AI_MODEL="..."
```

## 5. Results And Limits

Mention:

- Works offline for demos and tests.
- Live quality depends on the selected AI provider.
- JSON parsing intentionally targets simple chat completion responses.
- A future version could add a graphical frontend and cloud database sync.

