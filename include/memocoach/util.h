#ifndef MEMOCOACH_UTIL_H
#define MEMOCOACH_UTIL_H

#include <stddef.h>

char *mc_strdup(const char *value);
char *mc_read_file(const char *path, char *error, size_t error_size);
int mc_write_file(const char *path, const char *content, char *error, size_t error_size);
int mc_ensure_parent_dir(const char *path, char *error, size_t error_size);
void mc_now_iso8601(char *buffer, size_t size);
int mc_streq_ignore_case(const char *a, const char *b);
const char *mc_env_or_default(const char *name, const char *fallback);

#endif

