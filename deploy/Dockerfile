FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential sqlite3 libsqlite3-dev curl ca-certificates make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN make build

ENV MEMOCOACH_DB=/app/data/local.db
ENV MEMOCOACH_AI_MOCK=1

CMD ["./bin/memocoach", "--help"]

