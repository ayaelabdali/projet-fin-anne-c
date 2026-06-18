$ErrorActionPreference = "Stop"

function Get-GccPath {
    $gcc = Get-Command gcc -ErrorAction SilentlyContinue
    if ($gcc) {
        return $gcc.Source
    }

    $fallbacks = @(
        "C:\Program Files (x86)\Dev-Cpp\MinGW64\bin\gcc.exe",
        "C:\msys64\ucrt64\bin\gcc.exe",
        "C:\msys64\mingw64\bin\gcc.exe"
    )

    foreach ($path in $fallbacks) {
        if (Test-Path $path) {
            return $path
        }
    }

    throw "gcc was not found. Install MSYS2/MinGW or use the CI workflow."
}

function Get-SqliteAmalgamationDir {
    if ($env:SQLITE_AMALGAMATION_DIR -and
        (Test-Path (Join-Path $env:SQLITE_AMALGAMATION_DIR "sqlite3.h")) -and
        (Test-Path (Join-Path $env:SQLITE_AMALGAMATION_DIR "sqlite3.c"))) {
        return $env:SQLITE_AMALGAMATION_DIR
    }

    $existing = Get-ChildItem build\deps -Recurse -Filter sqlite3.h -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing -and (Test-Path (Join-Path $existing.Directory.FullName "sqlite3.c"))) {
        return $existing.Directory.FullName
    }

    $depsDir = "build\deps"
    $zipPath = Join-Path $depsDir "sqlite-amalgamation.zip"
    New-Item -ItemType Directory -Force -Path $depsDir | Out-Null

    curl.exe --ssl-no-revoke -L "https://sqlite.org/2026/sqlite-amalgamation-3530200.zip" -o $zipPath
    Expand-Archive -Force $zipPath $depsDir

    $downloaded = Get-ChildItem $depsDir -Recurse -Filter sqlite3.h | Select-Object -First 1
    if (-not $downloaded) {
        throw "Could not prepare SQLite amalgamation."
    }

    return $downloaded.Directory.FullName
}

$gcc = Get-GccPath
$sqliteDir = Get-SqliteAmalgamationDir
$sqliteC = Join-Path $sqliteDir "sqlite3.c"
$sqliteObj = "bin\sqlite3.o"
$commonFlags = @("-std=c11", "-Wall", "-Wextra", "-Wpedantic", "-Iinclude", "-I$sqliteDir")

New-Item -ItemType Directory -Force -Path "bin" | Out-Null

& $gcc -std=c11 "-I$sqliteDir" -w -c $sqliteC -o $sqliteObj
& $gcc @commonFlags src/main.c src/ai_client.c src/db.c src/json_utils.c src/util.c $sqliteObj -o bin/memocoach.exe

Write-Host "Built bin\memocoach.exe"
