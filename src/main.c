#include "memocoach/ai_client.h"
#include "memocoach/db.h"
#include "memocoach/util.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void print_help(void) {
    puts("MemoCoach AI");
    puts("");
    puts("Usage:");
    puts("  memocoach init [--db path]");
    puts("  memocoach add --course name --title title --content text [--db path]");
    puts("  memocoach add --course name --title title --file note.txt [--db path]");
    puts("  memocoach list [--db path]");
    puts("  memocoach show <id> [--db path]");
    puts("  memocoach summarize <id> [--db path]");
    puts("  memocoach quiz <id> [--db path]");
    puts("  memocoach history <id> [--db path]");
    puts("");
    puts("Environment:");
    puts("  MEMOCOACH_DB=data/local.db");
    puts("  MEMOCOACH_AI_MOCK=1");
    puts("  AI_PROVIDER_URL, AI_API_KEY, AI_MODEL for live AI calls");
}

static const char *arg_value(int argc, char **argv, const char *name) {
    int i;
    for (i = 1; i < argc - 1; i++) {
        if (strcmp(argv[i], name) == 0) {
            return argv[i + 1];
        }
    }
    return NULL;
}

static int has_arg(int argc, char **argv, const char *name) {
    int i;
    for (i = 1; i < argc; i++) {
        if (strcmp(argv[i], name) == 0) {
            return 1;
        }
    }
    return 0;
}

static const char *db_path(int argc, char **argv) {
    const char *path = arg_value(argc, argv, "--db");
    if (path) {
        return path;
    }
    return mc_env_or_default("MEMOCOACH_DB", "data/local.db");
}

static int open_ready_db(sqlite3 **db, int argc, char **argv) {
    char error[256];

    if (!db_open(db, db_path(argc, argv), error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        return 0;
    }

    if (!db_init(*db, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(*db);
        *db = NULL;
        return 0;
    }

    return 1;
}

static void print_note_row(int id, const char *course, const char *title, const char *created_at, void *user) {
    int *count = (int *)user;
    printf("%3d  %-18s  %-32s  %s\n", id, course, title, created_at);
    (*count)++;
}

static void print_result_row(int id, const char *task, const char *provider, const char *result, const char *created_at, void *user) {
    int *count = (int *)user;
    printf("\n[%d] %s via %s at %s\n", id, task, provider, created_at);
    printf("%s\n", result);
    (*count)++;
}

static int command_init(int argc, char **argv) {
    sqlite3 *db = NULL;
    char error[256];

    if (!db_open(&db, db_path(argc, argv), error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        return 1;
    }

    if (!db_init(db, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(db);
        return 1;
    }

    sqlite3_close(db);
    printf("Initialized database at %s\n", db_path(argc, argv));
    return 0;
}

static int command_add(int argc, char **argv) {
    sqlite3 *db = NULL;
    const char *title = arg_value(argc, argv, "--title");
    const char *course = arg_value(argc, argv, "--course");
    const char *content = arg_value(argc, argv, "--content");
    const char *file_path = arg_value(argc, argv, "--file");
    char *file_content = NULL;
    char error[256];
    int id = 0;
    int exit_code = 1;

    if (!title || !course || (!content && !file_path)) {
        fprintf(stderr, "Missing required arguments. Use --course, --title, and --content or --file.\n");
        return 1;
    }

    if (file_path) {
        file_content = mc_read_file(file_path, error, sizeof(error));
        if (!file_content) {
            fprintf(stderr, "%s\n", error);
            return 1;
        }
        content = file_content;
    }

    if (!open_ready_db(&db, argc, argv)) {
        free(file_content);
        return 1;
    }

    if (!db_add_note(db, title, course, content, &id, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        goto cleanup;
    }

    printf("Added note #%d\n", id);
    exit_code = 0;

cleanup:
    sqlite3_close(db);
    free(file_content);
    return exit_code;
}

static int command_list(int argc, char **argv) {
    sqlite3 *db = NULL;
    char error[256];
    int count = 0;

    if (!open_ready_db(&db, argc, argv)) {
        return 1;
    }

    printf(" ID  Course              Title                             Created\n");
    printf("---  ------------------  --------------------------------  --------------------\n");
    if (!db_list_notes(db, print_note_row, &count, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(db);
        return 1;
    }

    if (count == 0) {
        puts("No notes yet. Add one with: memocoach add --course ... --title ... --content ...");
    }

    sqlite3_close(db);
    return 0;
}

static int parse_id(const char *value, int *id_out) {
    char *end = NULL;
    long parsed;

    if (!value) {
        return 0;
    }

    parsed = strtol(value, &end, 10);
    if (*value == '\0' || *end != '\0' || parsed <= 0 || parsed > 2147483647L) {
        return 0;
    }

    *id_out = (int)parsed;
    return 1;
}

static int command_show(int argc, char **argv) {
    sqlite3 *db = NULL;
    char error[256];
    int id;
    Note note;

    if (!parse_id(argc > 2 ? argv[2] : NULL, &id)) {
        fprintf(stderr, "Provide a positive note id.\n");
        return 1;
    }

    if (!open_ready_db(&db, argc, argv)) {
        return 1;
    }

    if (!db_get_note(db, id, &note, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(db);
        return 1;
    }

    printf("#%d %s\n", note.id, note.title);
    printf("Course: %s\n", note.course);
    printf("Created: %s\n\n", note.created_at);
    printf("%s\n", note.content);

    note_free(&note);
    sqlite3_close(db);
    return 0;
}

static int run_ai_task(int argc, char **argv, const char *task) {
    sqlite3 *db = NULL;
    char error[256];
    int id;
    int result_id = 0;
    int exit_code = 1;
    Note note;
    AiResponse response;

    if (!parse_id(argc > 2 ? argv[2] : NULL, &id)) {
        fprintf(stderr, "Provide a positive note id.\n");
        return 1;
    }

    if (!open_ready_db(&db, argc, argv)) {
        return 1;
    }

    if (!db_get_note(db, id, &note, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(db);
        return 1;
    }

    if (!ai_generate_for_note(task, note.title, note.course, note.content, &response)) {
        fprintf(stderr, "AI error: %s\n", response.error);
        note_free(&note);
        sqlite3_close(db);
        return 1;
    }

    if (!db_save_ai_result(db, note.id, task, response.provider, response.text, &result_id, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        goto cleanup;
    }

    printf("%s\n", response.text);
    printf("\nSaved AI result #%d (%s%s)\n", result_id, response.provider, response.used_mock ? ", offline mock" : "");
    exit_code = 0;

cleanup:
    ai_response_free(&response);
    note_free(&note);
    sqlite3_close(db);
    return exit_code;
}

static int command_history(int argc, char **argv) {
    sqlite3 *db = NULL;
    char error[256];
    int id;
    int count = 0;

    if (!parse_id(argc > 2 ? argv[2] : NULL, &id)) {
        fprintf(stderr, "Provide a positive note id.\n");
        return 1;
    }

    if (!open_ready_db(&db, argc, argv)) {
        return 1;
    }

    if (!db_list_results(db, id, print_result_row, &count, error, sizeof(error))) {
        fprintf(stderr, "Database error: %s\n", error);
        sqlite3_close(db);
        return 1;
    }

    if (count == 0) {
        puts("No AI results saved for this note yet.");
    }

    sqlite3_close(db);
    return 0;
}

int main(int argc, char **argv) {
    const char *command;

    if (argc < 2 || has_arg(argc, argv, "--help") || has_arg(argc, argv, "-h")) {
        print_help();
        return argc < 2 ? 1 : 0;
    }

    command = argv[1];

    if (strcmp(command, "init") == 0) {
        return command_init(argc, argv);
    }
    if (strcmp(command, "add") == 0) {
        return command_add(argc, argv);
    }
    if (strcmp(command, "list") == 0) {
        return command_list(argc, argv);
    }
    if (strcmp(command, "show") == 0) {
        return command_show(argc, argv);
    }
    if (strcmp(command, "summarize") == 0) {
        return run_ai_task(argc, argv, "summary");
    }
    if (strcmp(command, "quiz") == 0) {
        return run_ai_task(argc, argv, "quiz");
    }
    if (strcmp(command, "history") == 0) {
        return command_history(argc, argv);
    }

    fprintf(stderr, "Unknown command: %s\n\n", command);
    print_help();
    return 1;
}

