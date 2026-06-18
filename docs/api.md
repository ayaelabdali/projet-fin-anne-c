# AI API Integration

MemoCoach has two AI paths:

- Web app: Vercel serverless route `api/ai.js` calls Gemini REST `generateContent`.
- C core: the CLI can call an OpenAI-compatible endpoint with `curl`, parse JSON in C, and store output in SQLite.

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `MEMOCOACH_AI_MOCK` | No | Set to `1`, `true`, or `yes` to force offline mock output. |
| `GEMINI_API_KEY` | Yes for web live AI | Google AI Studio Gemini API key for Vercel/local server. |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.0-flash-lite`, with `gemini-1.5-flash` as fallback. |
| `AI_PROVIDER_URL` | Yes for live calls | Chat completion endpoint URL. |
| `AI_API_KEY` | Yes for live calls | Bearer token for the provider. |
| `AI_MODEL` | Provider-specific | Model name expected by the provider. |
| `MEMOCOACH_DB` | No | SQLite database path. Defaults to `data/local.db`. |

## Example Live Configuration

```bash
export MEMOCOACH_AI_MOCK=0
export GEMINI_API_KEY="your-gemini-key"
export GEMINI_MODEL="gemini-2.0-flash-lite"
export AI_PROVIDER_URL="https://api.example.com/v1/chat/completions"
export AI_API_KEY="your-secret-key"
export AI_MODEL="gemini-2.0-flash-lite"
```

Do not commit real keys.

## Web Gemini Request Shape

The Vercel route sends a Gemini REST request similar to:

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Summarize this student note..."
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.25,
    "maxOutputTokens": 900
  }
}
```

## C Core Request Shape

The request body follows this structure:

```json
{
  "model": "provider-model-name",
  "messages": [
    {
      "role": "system",
      "content": "You are MemoCoach, a precise study assistant..."
    },
    {
      "role": "user",
      "content": "Summarize this student note..."
    }
  ],
  "temperature": 0.2
}
```

## Response Shape

The parser expects the assistant answer at a `content` string field, as in:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Generated summary text"
      }
    }
  ]
}
```

## Manual Curl Test

Before running the C app against a provider, test your endpoint manually:

```bash
curl -sS "$AI_PROVIDER_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AI_API_KEY" \
  --data '{
    "model": "'"$AI_MODEL"'",
    "messages": [
      {"role": "system", "content": "You are a concise study assistant."},
      {"role": "user", "content": "Summarize pointers in C."}
    ],
    "temperature": 0.2
  }'
```

## Offline Demo Mode

Use:

```bash
export MEMOCOACH_AI_MOCK=1
```

Mock mode is deterministic and does not contact the internet. It is useful for CI, classroom demos without Wi-Fi, and development before API credentials are ready.
