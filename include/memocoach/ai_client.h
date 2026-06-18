#ifndef MEMOCOACH_AI_CLIENT_H
#define MEMOCOACH_AI_CLIENT_H

typedef struct {
    char *text;
    int used_mock;
    char provider[96];
    char error[256];
} AiResponse;

int ai_generate_for_note(
    const char *task,
    const char *title,
    const char *course,
    const char *content,
    AiResponse *response
);

void ai_response_free(AiResponse *response);

#endif

