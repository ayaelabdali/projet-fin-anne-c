#ifndef _WIN32
#define _POSIX_C_SOURCE 200112L
#endif

#include "memocoach/ai_client.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void set_mock_mode(void) {
#ifdef _WIN32
    _putenv("MEMOCOACH_AI_MOCK=1");
#else
    setenv("MEMOCOACH_AI_MOCK", "1", 1);
#endif
}

int main(void) {
    AiResponse response;

    set_mock_mode();

    assert(ai_generate_for_note(
        "summary",
        "Pointers",
        "C Programming",
        "Pointers store memory addresses and are dereferenced with the star operator.",
        &response
    ));

    assert(response.used_mock == 1);
    assert(strcmp(response.provider, "mock") == 0);
    assert(response.text != NULL);
    assert(strstr(response.text, "Mock summary") != NULL);
    assert(strstr(response.text, "Pointers") != NULL);

    ai_response_free(&response);

    puts("test_ai_client: ok");
    return 0;
}
