#include "memocoach/db.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    int rows;
    int saw_expected;
} Counter;

static void count_note(int id, const char *course, const char *title, const char *created_at, void *user) {
    Counter *counter = (Counter *)user;
    (void)created_at;
    counter->rows++;
    if (id > 0 && strcmp(course, "Algorithms") == 0 && strcmp(title, "Binary Search") == 0) {
        counter->saw_expected = 1;
    }
}

static void count_result(int id, const char *task, const char *provider, const char *result, const char *created_at, void *user) {
    Counter *counter = (Counter *)user;
    (void)created_at;
    counter->rows++;
    if (id > 0 && strcmp(task, "summary") == 0 && strcmp(provider, "mock") == 0 && strstr(result, "logarithmic") != NULL) {
        counter->saw_expected = 1;
    }
}

int main(void) {
    const char *path = "data/test_memocoach.db";
    sqlite3 *db = NULL;
    char error[256];
    int note_id = 0;
    int result_id = 0;
    Note note;
    Counter counter = {0, 0};
    Counter result_counter = {0, 0};

    remove(path);

    assert(db_open(&db, path, error, sizeof(error)));
    assert(db_init(db, error, sizeof(error)));
    assert(db_add_note(db, "Binary Search", "Algorithms", "Binary search halves a sorted interval, so it is logarithmic.", &note_id, error, sizeof(error)));
    assert(note_id > 0);

    assert(db_get_note(db, note_id, &note, error, sizeof(error)));
    assert(strcmp(note.title, "Binary Search") == 0);
    assert(strcmp(note.course, "Algorithms") == 0);
    assert(strstr(note.content, "logarithmic") != NULL);
    note_free(&note);

    assert(db_list_notes(db, count_note, &counter, error, sizeof(error)));
    assert(counter.rows == 1);
    assert(counter.saw_expected == 1);

    assert(db_save_ai_result(db, note_id, "summary", "mock", "A logarithmic search summary.", &result_id, error, sizeof(error)));
    assert(result_id > 0);
    assert(db_list_results(db, note_id, count_result, &result_counter, error, sizeof(error)));
    assert(result_counter.rows == 1);
    assert(result_counter.saw_expected == 1);

    sqlite3_close(db);
    remove(path);

    puts("test_db: ok");
    return 0;
}

