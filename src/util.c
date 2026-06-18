#include "memocoach/util.h"

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <direct.h>
#define MC_MKDIR(path) _mkdir(path)
#else
#include <sys/stat.h>
#include <sys/types.h>
#define MC_MKDIR(path) mkdir(path, 0755)
#endif

char *mc_strdup(const char *value) {
    size_t length;
    char *copy;

    if (!value) {
        value = "";
    }

    length = strlen(value);
    copy = (char *)malloc(length + 1);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, value, length + 1);
    return copy;
}

char *mc_read_file(const char *path, char *error, size_t error_size) {
    FILE *file;
    long length;
    char *buffer;
    size_t read_count;

    file = fopen(path, "rb");
    if (!file) {
        snprintf(error, error_size, "Cannot open file '%s': %s", path, strerror(errno));
        return NULL;
    }

    if (fseek(file, 0, SEEK_END) != 0) {
        snprintf(error, error_size, "Cannot seek file '%s'", path);
        fclose(file);
        return NULL;
    }

    length = ftell(file);
    if (length < 0) {
        snprintf(error, error_size, "Cannot measure file '%s'", path);
        fclose(file);
        return NULL;
    }

    rewind(file);
    buffer = (char *)malloc((size_t)length + 1);
    if (!buffer) {
        snprintf(error, error_size, "Out of memory reading '%s'", path);
        fclose(file);
        return NULL;
    }

    read_count = fread(buffer, 1, (size_t)length, file);
    if (read_count != (size_t)length) {
        snprintf(error, error_size, "Cannot read full file '%s'", path);
        free(buffer);
        fclose(file);
        return NULL;
    }

    buffer[length] = '\0';
    fclose(file);
    return buffer;
}

int mc_write_file(const char *path, const char *content, char *error, size_t error_size) {
    FILE *file;
    size_t length;

    if (!mc_ensure_parent_dir(path, error, error_size)) {
        return 0;
    }

    file = fopen(path, "wb");
    if (!file) {
        snprintf(error, error_size, "Cannot open file '%s' for writing: %s", path, strerror(errno));
        return 0;
    }

    length = strlen(content);
    if (fwrite(content, 1, length, file) != length) {
        snprintf(error, error_size, "Cannot write file '%s'", path);
        fclose(file);
        return 0;
    }

    fclose(file);
    return 1;
}

int mc_ensure_parent_dir(const char *path, char *error, size_t error_size) {
    char *copy;
    char *last_slash;
    char *last_backslash;
    char *cursor;

    copy = mc_strdup(path);
    if (!copy) {
        snprintf(error, error_size, "Out of memory while preparing path");
        return 0;
    }

    last_slash = strrchr(copy, '/');
    last_backslash = strrchr(copy, '\\');
    if (!last_slash || (last_backslash && last_backslash > last_slash)) {
        last_slash = last_backslash;
    }

    if (!last_slash) {
        free(copy);
        return 1;
    }

    *last_slash = '\0';
    if (copy[0] == '\0') {
        free(copy);
        return 1;
    }

    cursor = copy;
#ifdef _WIN32
    if (strlen(copy) > 2 && copy[1] == ':') {
        cursor = copy + 2;
        if (*cursor == '/' || *cursor == '\\') {
            cursor++;
        }
    }
#endif

    for (; *cursor; cursor++) {
        if (*cursor == '/' || *cursor == '\\') {
            char saved = *cursor;
            *cursor = '\0';
            if (copy[0] != '\0' && MC_MKDIR(copy) != 0 && errno != EEXIST) {
                snprintf(error, error_size, "Cannot create directory '%s': %s", copy, strerror(errno));
                free(copy);
                return 0;
            }
            *cursor = saved;
        }
    }

    if (MC_MKDIR(copy) != 0 && errno != EEXIST) {
        snprintf(error, error_size, "Cannot create directory '%s': %s", copy, strerror(errno));
        free(copy);
        return 0;
    }

    free(copy);
    return 1;
}

void mc_now_iso8601(char *buffer, size_t size) {
    time_t now;
    struct tm *utc;

    now = time(NULL);
    utc = gmtime(&now);
    if (!utc) {
        snprintf(buffer, size, "1970-01-01T00:00:00Z");
        return;
    }

    strftime(buffer, size, "%Y-%m-%dT%H:%M:%SZ", utc);
}

int mc_streq_ignore_case(const char *a, const char *b) {
    if (!a || !b) {
        return a == b;
    }

    while (*a && *b) {
        if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) {
            return 0;
        }
        a++;
        b++;
    }

    return *a == *b;
}

const char *mc_env_or_default(const char *name, const char *fallback) {
    const char *value = getenv(name);
    if (!value || value[0] == '\0') {
        return fallback;
    }
    return value;
}
