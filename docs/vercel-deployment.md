# Vercel Deployment

MemoCoach AI includes a Vercel-ready dynamic web interface in addition to the C core demo.

## Local Web Run

```bash
npm run dev
```

Open the local URL shown by the server.

## Production Deploy

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Keep the build command:

```bash
npm run build
```

4. Keep the output directory:

```text
dist
```

## Gemini Live AI Variables

Set these in the Vercel dashboard to use Gemini instead of mock mode:

```text
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.1-flash-lite
```

Without those variables, the web app uses deterministic mock AI output so the demo still works.

Get the key from Google AI Studio, then keep it only in Vercel environment variables. Do not paste the key into browser code.

## Required C Core

The C backend/core remains in:

```text
src/
include/
tests/
```

For the defense, show both:

- Web UI deployed on Vercel
- C executable demo with SQLite using `scripts/build.ps1` and `scripts/run-tests.ps1`
