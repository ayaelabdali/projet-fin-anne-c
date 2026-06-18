#ifndef MEMOCOACH_DB_H
#define MEMOCOACH_DB_H

#include <sqlite3.h>

typedef struct {
    int id;
    char *title;
    char *course;
    char *content;
    char *created_at;
} Note;

typedef void (*note_row_callback)(
    int id,
    const char *course,
    const char *title,
    const char *created_at,
    void *user
);

typedef void (*result_row_callback)(
    int id,
    const char *task,
    const char *provider,
    const char *result,
    const char *created_at,
    void *user
);

int db_open(sqlite3 **db, const char *path, char *error, int error_size);
int db_init(sqlite3 *db, char *error, int error_size);
int db_add_note(sqlite3 *db, const char *title, const char *course, const char *content, int *id_out, char *error, int error_size);
int db_get_note(sqlite3 *db, int id, Note *note, char *error, int error_size);
int db_list_notes(sqlite3 *db, note_row_callback callback, void *user, char *error, int error_size);
int db_save_ai_result(sqlite3 *db, int note_id, const char *task, const char *provider, const char *result, int *id_out, char *error, int error_size);
int db_list_results(sqlite3 *db, int note_id, result_row_callback callback, void *user, char *error, int error_size);
void note_free(Note *note);

#endif

