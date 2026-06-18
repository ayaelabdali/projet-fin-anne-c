#include "memocoach/db.h"

#include "memocoach/util.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void set_error(char *error, int error_size, const char *message, sqlite3 *db) {
    if (!error || error_size <= 0) {
        return;
    }
    if (db) {
        snprintf(error, (size_t)error_size, "%s: %s", message, sqlite3_errmsg(db));
    } else {
        snprintf(error, (size_t)error_size, "%s", message);
    }
}

int db_open(sqlite3 **db, const char *path, char *error, int error_size) {
    if (!mc_ensure_parent_dir(path, error, (size_t)error_size)) {
        return 0;
    }

    if (sqlite3_open(path, db) != SQLITE_OK) {
        set_error(error, error_size, "Cannot open SQLite database", *db);
        if (*db) {
            sqlite3_close(*db);
            *db = NULL;
        }
        return 0;
    }

    sqlite3_exec(*db, "PRAGMA foreign_keys = ON;", NULL, NULL, NULL);
    return 1;
}

int db_init(sqlite3 *db, char *error, int error_size) {
    const char *schema =
        "CREATE TABLE IF NOT EXISTS notes ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "title TEXT NOT NULL,"
        "course TEXT NOT NULL,"
        "content TEXT NOT NULL,"
        "created_at TEXT NOT NULL"
        ");"
        "CREATE TABLE IF NOT EXISTS ai_results ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "note_id INTEGER NOT NULL,"
        "task TEXT NOT NULL,"
        "provider TEXT NOT NULL,"
        "result TEXT NOT NULL,"
        "created_at TEXT NOT NULL,"
        "FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE"
        ");";
    char *sqlite_error = NULL;

    if (sqlite3_exec(db, schema, NULL, NULL, &sqlite_error) != SQLITE_OK) {
        snprintf(error, (size_t)error_size, "Cannot initialize schema: %s", sqlite_error ? sqlite_error : "unknown error");
        sqlite3_free(sqlite_error);
        return 0;
    }

    return 1;
}

int db_add_note(sqlite3 *db, const char *title, const char *course, const char *content, int *id_out, char *error, int error_size) {
    sqlite3_stmt *stmt = NULL;
    char created_at[32];
    const char *sql = "INSERT INTO notes(title, course, content, created_at) VALUES (?, ?, ?, ?);";

    mc_now_iso8601(created_at, sizeof(created_at));

    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        set_error(error, error_size, "Cannot prepare note insert", db);
        return 0;
    }

    sqlite3_bind_text(stmt, 1, title, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, course, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, content, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, created_at, -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        set_error(error, error_size, "Cannot insert note", db);
        sqlite3_finalize(stmt);
        return 0;
    }

    sqlite3_finalize(stmt);
    if (id_out) {
        *id_out = (int)sqlite3_last_insert_rowid(db);
    }
    return 1;
}

static char *column_text_copy(sqlite3_stmt *stmt, int column) {
    const unsigned char *text = sqlite3_column_text(stmt, column);
    return mc_strdup(text ? (const char *)text : "");
}

int db_get_note(sqlite3 *db, int id, Note *note, char *error, int error_size) {
    sqlite3_stmt *stmt = NULL;
    const char *sql = "SELECT id, title, course, content, created_at FROM notes WHERE id = ?;";
    int step_result;

    memset(note, 0, sizeof(*note));

    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        set_error(error, error_size, "Cannot prepare note lookup", db);
        return 0;
    }

    sqlite3_bind_int(stmt, 1, id);
    step_result = sqlite3_step(stmt);

    if (step_result == SQLITE_ROW) {
        note->id = sqlite3_column_int(stmt, 0);
        note->title = column_text_copy(stmt, 1);
        note->course = column_text_copy(stmt, 2);
        note->content = column_text_copy(stmt, 3);
        note->created_at = column_text_copy(stmt, 4);

        if (!note->title || !note->course || !note->content || !note->created_at) {
            note_free(note);
            set_error(error, error_size, "Out of memory reading note", NULL);
            sqlite3_finalize(stmt);
            return 0;
        }

        sqlite3_finalize(stmt);
        return 1;
    }

    sqlite3_finalize(stmt);

    if (step_result == SQLITE_DONE) {
        snprintf(error, (size_t)error_size, "No note found with id %d", id);
        return 0;
    }

    set_error(error, error_size, "Cannot read note", db);
    return 0;
}

int db_list_notes(sqlite3 *db, note_row_callback callback, void *user, char *error, int error_size) {
    sqlite3_stmt *stmt = NULL;
    const char *sql = "SELECT id, course, title, created_at FROM notes ORDER BY id DESC;";
    int result;

    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        set_error(error, error_size, "Cannot prepare note listing", db);
        return 0;
    }

    while ((result = sqlite3_step(stmt)) == SQLITE_ROW) {
        if (callback) {
            callback(
                sqlite3_column_int(stmt, 0),
                (const char *)sqlite3_column_text(stmt, 1),
                (const char *)sqlite3_column_text(stmt, 2),
                (const char *)sqlite3_column_text(stmt, 3),
                user
            );
        }
    }

    sqlite3_finalize(stmt);

    if (result != SQLITE_DONE) {
        set_error(error, error_size, "Cannot list notes", db);
        return 0;
    }

    return 1;
}

int db_save_ai_result(sqlite3 *db, int note_id, const char *task, const char *provider, const char *result_text, int *id_out, char *error, int error_size) {
    sqlite3_stmt *stmt = NULL;
    char created_at[32];
    const char *sql = "INSERT INTO ai_results(note_id, task, provider, result, created_at) VALUES (?, ?, ?, ?, ?);";

    mc_now_iso8601(created_at, sizeof(created_at));

    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        set_error(error, error_size, "Cannot prepare AI result insert", db);
        return 0;
    }

    sqlite3_bind_int(stmt, 1, note_id);
    sqlite3_bind_text(stmt, 2, task, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, provider, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, result_text, -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, created_at, -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) != SQLITE_DONE) {
        set_error(error, error_size, "Cannot save AI result", db);
        sqlite3_finalize(stmt);
        return 0;
    }

    sqlite3_finalize(stmt);
    if (id_out) {
        *id_out = (int)sqlite3_last_insert_rowid(db);
    }
    return 1;
}

int db_list_results(sqlite3 *db, int note_id, result_row_callback callback, void *user, char *error, int error_size) {
    sqlite3_stmt *stmt = NULL;
    const char *sql = "SELECT id, task, provider, result, created_at FROM ai_results WHERE note_id = ? ORDER BY id DESC;";
    int result;

    if (sqlite3_prepare_v2(db, sql, -1, &stmt, NULL) != SQLITE_OK) {
        set_error(error, error_size, "Cannot prepare result listing", db);
        return 0;
    }

    sqlite3_bind_int(stmt, 1, note_id);

    while ((result = sqlite3_step(stmt)) == SQLITE_ROW) {
        if (callback) {
            callback(
                sqlite3_column_int(stmt, 0),
                (const char *)sqlite3_column_text(stmt, 1),
                (const char *)sqlite3_column_text(stmt, 2),
                (const char *)sqlite3_column_text(stmt, 3),
                (const char *)sqlite3_column_text(stmt, 4),
                user
            );
        }
    }

    sqlite3_finalize(stmt);

    if (result != SQLITE_DONE) {
        set_error(error, error_size, "Cannot list AI results", db);
        return 0;
    }

    return 1;
}

void note_free(Note *note) {
    if (!note) {
        return;
    }
    free(note->title);
    free(note->course);
    free(note->content);
    free(note->created_at);
    memset(note, 0, sizeof(*note));
}

