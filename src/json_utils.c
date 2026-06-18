#include "memocoach/json_utils.h"

#include "memocoach/util.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int append_char(char **buffer, size_t *length, size_t *capacity, char value) {
    char *grown;

    if (*length + 2 > *capacity) {
        *capacity *= 2;
        grown = (char *)realloc(*buffer, *capacity);
        if (!grown) {
            free(*buffer);
            *buffer = NULL;
            return 0;
        }
        *buffer = grown;
    }

    (*buffer)[(*length)++] = value;
    (*buffer)[*length] = '\0';
    return 1;
}

static int append_text(char **buffer, size_t *length, size_t *capacity, const char *text) {
    while (*text) {
        if (!append_char(buffer, length, capacity, *text++)) {
            return 0;
        }
    }
    return 1;
}

char *json_escape(const char *input) {
    size_t capacity = 128;
    size_t length = 0;
    char *escaped = (char *)malloc(capacity);

    if (!escaped) {
        return NULL;
    }
    escaped[0] = '\0';

    if (!input) {
        return escaped;
    }

    while (*input) {
        unsigned char c = (unsigned char)*input++;
        char unicode_escape[8];

        switch (c) {
            case '\\':
                if (!append_text(&escaped, &length, &capacity, "\\\\")) return NULL;
                break;
            case '"':
                if (!append_text(&escaped, &length, &capacity, "\\\"")) return NULL;
                break;
            case '\n':
                if (!append_text(&escaped, &length, &capacity, "\\n")) return NULL;
                break;
            case '\r':
                if (!append_text(&escaped, &length, &capacity, "\\r")) return NULL;
                break;
            case '\t':
                if (!append_text(&escaped, &length, &capacity, "\\t")) return NULL;
                break;
            case '\b':
                if (!append_text(&escaped, &length, &capacity, "\\b")) return NULL;
                break;
            case '\f':
                if (!append_text(&escaped, &length, &capacity, "\\f")) return NULL;
                break;
            default:
                if (c < 0x20) {
                    snprintf(unicode_escape, sizeof(unicode_escape), "\\u%04x", c);
                    if (!append_text(&escaped, &length, &capacity, unicode_escape)) return NULL;
                } else {
                    if (!append_char(&escaped, &length, &capacity, (char)c)) return NULL;
                }
                break;
        }
    }

    return escaped;
}

static const char *skip_ws(const char *cursor) {
    while (*cursor && isspace((unsigned char)*cursor)) {
        cursor++;
    }
    return cursor;
}

static int hex_digit(char value) {
    if (value >= '0' && value <= '9') return value - '0';
    if (value >= 'a' && value <= 'f') return 10 + value - 'a';
    if (value >= 'A' && value <= 'F') return 10 + value - 'A';
    return -1;
}

static char *parse_json_string(const char *cursor, const char **end_out) {
    size_t capacity = 128;
    size_t length = 0;
    char *result;

    if (*cursor != '"') {
        return NULL;
    }
    cursor++;

    result = (char *)malloc(capacity);
    if (!result) {
        return NULL;
    }
    result[0] = '\0';

    while (*cursor && *cursor != '"') {
        char c = *cursor++;

        if (c == '\\') {
            c = *cursor++;
            switch (c) {
                case '"': if (!append_char(&result, &length, &capacity, '"')) return NULL; break;
                case '\\': if (!append_char(&result, &length, &capacity, '\\')) return NULL; break;
                case '/': if (!append_char(&result, &length, &capacity, '/')) return NULL; break;
                case 'b': if (!append_char(&result, &length, &capacity, '\b')) return NULL; break;
                case 'f': if (!append_char(&result, &length, &capacity, '\f')) return NULL; break;
                case 'n': if (!append_char(&result, &length, &capacity, '\n')) return NULL; break;
                case 'r': if (!append_char(&result, &length, &capacity, '\r')) return NULL; break;
                case 't': if (!append_char(&result, &length, &capacity, '\t')) return NULL; break;
                case 'u': {
                    int h1 = hex_digit(cursor[0]);
                    int h2 = hex_digit(cursor[1]);
                    int h3 = hex_digit(cursor[2]);
                    int h4 = hex_digit(cursor[3]);
                    int codepoint;
                    if (h1 < 0 || h2 < 0 || h3 < 0 || h4 < 0) {
                        free(result);
                        return NULL;
                    }
                    codepoint = (h1 << 12) | (h2 << 8) | (h3 << 4) | h4;
                    cursor += 4;
                    if (codepoint >= 0 && codepoint <= 0x7f) {
                        if (!append_char(&result, &length, &capacity, (char)codepoint)) return NULL;
                    } else {
                        if (!append_char(&result, &length, &capacity, '?')) return NULL;
                    }
                    break;
                }
                default:
                    free(result);
                    return NULL;
            }
        } else {
            if (!append_char(&result, &length, &capacity, c)) {
                return NULL;
            }
        }
    }

    if (*cursor != '"') {
        free(result);
        return NULL;
    }

    if (end_out) {
        *end_out = cursor + 1;
    }
    return result;
}

char *json_extract_string_field(const char *json, const char *field) {
    char *field_escaped;
    size_t pattern_length;
    char *pattern;
    const char *cursor;

    if (!json || !field) {
        return NULL;
    }

    field_escaped = json_escape(field);
    if (!field_escaped) {
        return NULL;
    }

    pattern_length = strlen(field_escaped) + 3;
    pattern = (char *)malloc(pattern_length);
    if (!pattern) {
        free(field_escaped);
        return NULL;
    }
    snprintf(pattern, pattern_length, "\"%s\"", field_escaped);
    free(field_escaped);

    cursor = json;
    while ((cursor = strstr(cursor, pattern)) != NULL) {
        const char *after_key = skip_ws(cursor + strlen(pattern));
        if (*after_key == ':') {
            const char *value_start = skip_ws(after_key + 1);
            free(pattern);
            return parse_json_string(value_start, NULL);
        }
        cursor++;
    }

    free(pattern);
    return NULL;
}

char *json_extract_openai_content(const char *json) {
    return json_extract_string_field(json, "content");
}

