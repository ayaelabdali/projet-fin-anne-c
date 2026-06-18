# Itch.io Packaging Notes

MemoCoach is a desktop/CLI project, so the recommended public distribution channel is an Itch.io project page or a GitHub Release.

## Release Build

On Linux:

```bash
make clean
make build
zip -r memocoach-ai-linux.zip bin/memocoach README.md docs deploy .env.example
```

On Windows, build with MSYS2/MinGW and package:

```powershell
.\scripts\run-tests.ps1
Compress-Archive -Path bin\memocoach.exe, README.md, docs, deploy, .env.example -DestinationPath memocoach-ai-windows.zip
```

## Itch.io Page Content

Suggested title:

```text
MemoCoach AI - C Study Assistant
```

Suggested short description:

```text
A C and SQLite study assistant that turns course notes into AI summaries and quizzes through a REST API.
```

Include:

- Build archive
- README instructions
- Demo video link
- LinkedIn post link
- Note that offline mock mode is available with `MEMOCOACH_AI_MOCK=1`

