CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Iinclude
LDFLAGS ?= -lsqlite3

APP := bin/memocoach
SRC := src/main.c src/ai_client.c src/db.c src/json_utils.c src/util.c
TEST_JSON := bin/test_json_utils
TEST_DB := bin/test_db
TEST_AI := bin/test_ai_client

.PHONY: all build test clean

all: build

build: $(APP)

$(APP): $(SRC)
	@mkdir -p bin
	$(CC) $(CFLAGS) $(SRC) -o $(APP) $(LDFLAGS)

$(TEST_JSON): tests/test_json_utils.c src/json_utils.c src/util.c
	@mkdir -p bin
	$(CC) $(CFLAGS) tests/test_json_utils.c src/json_utils.c src/util.c -o $(TEST_JSON)

$(TEST_DB): tests/test_db.c src/db.c src/util.c
	@mkdir -p bin
	$(CC) $(CFLAGS) tests/test_db.c src/db.c src/util.c -o $(TEST_DB) $(LDFLAGS)

$(TEST_AI): tests/test_ai_client.c src/ai_client.c src/json_utils.c src/util.c
	@mkdir -p bin
	$(CC) $(CFLAGS) tests/test_ai_client.c src/ai_client.c src/json_utils.c src/util.c -o $(TEST_AI)

test: $(TEST_JSON) $(TEST_DB) $(TEST_AI)
	./$(TEST_JSON)
	./$(TEST_DB)
	./$(TEST_AI)

clean:
	rm -rf bin build
