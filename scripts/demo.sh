#!/usr/bin/env bash
set -euo pipefail

export MEMOCOACH_DB="${MEMOCOACH_DB:-data/demo.db}"
export MEMOCOACH_AI_MOCK="${MEMOCOACH_AI_MOCK:-1}"

make build

./bin/memocoach init
./bin/memocoach add --course "C Programming" --title "Pointers" --content "Pointers store memory addresses. The address-of operator obtains an address and the dereference operator reads or writes the pointed value."
./bin/memocoach list
./bin/memocoach summarize 1
./bin/memocoach quiz 1
./bin/memocoach history 1

