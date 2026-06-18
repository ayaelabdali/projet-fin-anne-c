#include "memocoach/json_utils.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void test_escape(void) {
    char *escaped = json_escape("line 1\n\"quoted\"\\path");
    assert(escaped != NULL);
    assert(strcmp(escaped, "line 1\\n\\\"quoted\\\"\\\\path") == 0);
    free(escaped);
}

static void test_extract_content(void) {
    const char *json = "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Hello\\nstudent\"}}]}";
    char *content = json_extract_openai_content(json);
    assert(content != NULL);
    assert(strcmp(content, "Hello\nstudent") == 0);
    free(content);
}

static void test_missing_field(void) {
    char *content = json_extract_openai_content("{\"ok\":true}");
    assert(content == NULL);
}

int main(void) {
    test_escape();
    test_extract_content();
    test_missing_field();
    puts("test_json_utils: ok");
    return 0;
}

