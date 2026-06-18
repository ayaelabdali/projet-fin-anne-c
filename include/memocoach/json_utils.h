#ifndef MEMOCOACH_JSON_UTILS_H
#define MEMOCOACH_JSON_UTILS_H

char *json_escape(const char *input);
char *json_extract_string_field(const char *json, const char *field);
char *json_extract_openai_content(const char *json);

#endif

