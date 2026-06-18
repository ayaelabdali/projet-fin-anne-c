#ifndef _WIN32
#define _POSIX_C_SOURCE 200809L
#endif

#include "memocoach/ai_client.h"

#include "memocoach/json_utils.h"
#include "memocoach/util.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#define popen _popen
#define pclose _pclose
#endif

static void ai_set_error(AiResponse *response, const char *message) {
    if (response) {
        snprintf(response->error, sizeof(response->error), "%s", message);
    }
}

static char *first_chars(const char *content, size_t limit) {
    size_t length = strlen(content);
    char *copy;

    if (length > limit) {
        length = limit;
    }

    copy = (char *)malloc(length + 1);
    if (!copy) {
        return NULL;
    }
    memcpy(copy, content, length);
    copy[length] = '\0';
    return copy;
}

static int build_mock_response(const char *task, const char *title, const char *course, const char *content, AiResponse *response) {
    char *snippet = first_chars(content, 220);
    size_t needed;

    if (!snippet) {
        ai_set_error(response, "Out of memory building mock AI response");
        return 0;
    }

    response->used_mock = 1;
    snprintf(response->provider, sizeof(response->provider), "mock");

    if (strcmp(task, "quiz") == 0) {
        needed = strlen(title) + strlen(course) + strlen(snippet) + 512;
        response->text = (char *)malloc(needed);
        if (!response->text) {
            free(snippet);
            ai_set_error(response, "Out of memory building mock quiz");
            return 0;
        }
        snprintf(
            response->text,
            needed,
            "Mock quiz for '%s' (%s)\n\n"
            "1. What is the main idea of this note?\n"
            "2. Which term or mechanism should you define precisely?\n"
            "3. Give one practical example based on: %s%s\n",
            title,
            course,
            snippet,
            strlen(content) > 220 ? "..." : ""
        );
    } else {
        needed = strlen(title) + strlen(course) + strlen(snippet) + 420;
        response->text = (char *)malloc(needed);
        if (!response->text) {
            free(snippet);
            ai_set_error(response, "Out of memory building mock summary");
            return 0;
        }
        snprintf(
            response->text,
            needed,
            "Mock summary for '%s' (%s)\n\n"
            "Key idea: %s%s\n\n"
            "Revision advice: rewrite this note as three bullet points, then test yourself with one example.",
            title,
            course,
            snippet,
            strlen(content) > 220 ? "..." : ""
        );
    }

    free(snippet);
    return 1;
}

static char *shell_quote(const char *value) {
#ifdef _WIN32
    size_t length = strlen(value);
    size_t capacity = length * 2 + 3;
    size_t i;
    size_t out = 0;
    char *quoted = (char *)malloc(capacity);
    if (!quoted) return NULL;
    quoted[out++] = '"';
    for (i = 0; i < length; i++) {
        if (value[i] == '"') {
            quoted[out++] = '\\';
        }
        quoted[out++] = value[i];
    }
    quoted[out++] = '"';
    quoted[out] = '\0';
    return quoted;
#else
    size_t length = strlen(value);
    size_t capacity = length * 4 + 3;
    size_t i;
    size_t out = 0;
    char *quoted = (char *)malloc(capacity);
    if (!quoted) return NULL;
    quoted[out++] = '\'';
    for (i = 0; i < length; i++) {
        if (value[i] == '\'') {
            memcpy(quoted + out, "'\\''", 4);
            out += 4;
        } else {
            quoted[out++] = value[i];
        }
    }
    quoted[out++] = '\'';
    quoted[out] = '\0';
    return quoted;
#endif
}

static char *read_process_output(const char *command) {
    FILE *pipe = popen(command, "r");
    char chunk[512];
    char *output = NULL;
    size_t length = 0;
    size_t capacity = 4096;

    if (!pipe) {
        return NULL;
    }

    output = (char *)malloc(capacity);
    if (!output) {
        pclose(pipe);
        return NULL;
    }
    output[0] = '\0';

    while (fgets(chunk, sizeof(chunk), pipe)) {
        size_t chunk_length = strlen(chunk);
        if (length + chunk_length + 1 > capacity) {
            char *grown;
            while (length + chunk_length + 1 > capacity) {
                capacity *= 2;
            }
            grown = (char *)realloc(output, capacity);
            if (!grown) {
                free(output);
                pclose(pipe);
                return NULL;
            }
            output = grown;
        }
        memcpy(output + length, chunk, chunk_length + 1);
        length += chunk_length;
    }

    pclose(pipe);
    return output;
}

static char *build_prompt(const char *task, const char *title, const char *course, const char *content) {
    char *escaped_title = json_escape(title);
    char *escaped_course = json_escape(course);
    char *escaped_content = json_escape(content);
    const char *instruction = strcmp(task, "quiz") == 0
        ? "Create five concise quiz questions with short answers from this student note."
        : "Summarize this student note in concise study-friendly bullet points.";
    char *escaped_instruction = json_escape(instruction);
    size_t needed;
    char *prompt;

    if (!escaped_title || !escaped_course || !escaped_content || !escaped_instruction) {
        free(escaped_title);
        free(escaped_course);
        free(escaped_content);
        free(escaped_instruction);
        return NULL;
    }

    needed = strlen(escaped_title) + strlen(escaped_course) + strlen(escaped_content) + strlen(escaped_instruction) + 256;
    prompt = (char *)malloc(needed);
    if (!prompt) {
        free(escaped_title);
        free(escaped_course);
        free(escaped_content);
        free(escaped_instruction);
        return NULL;
    }

    snprintf(
        prompt,
        needed,
        "%s\\n\\nCourse: %s\\nTitle: %s\\nNote:\\n%s",
        escaped_instruction,
        escaped_course,
        escaped_title,
        escaped_content
    );

    free(escaped_title);
    free(escaped_course);
    free(escaped_content);
    free(escaped_instruction);
    return prompt;
}

static char *build_request_json(const char *model, const char *prompt) {
    const char *system_message = "You are MemoCoach, a precise study assistant. Keep answers useful, brief, and easy to revise.";
    char *system_escaped = json_escape(system_message);
    char *model_escaped = json_escape(model);
    size_t needed;
    char *body;

    if (!system_escaped || !model_escaped) {
        free(system_escaped);
        free(model_escaped);
        return NULL;
    }

    needed = strlen(model_escaped) + strlen(system_escaped) + strlen(prompt) + 320;
    body = (char *)malloc(needed);
    if (!body) {
        free(system_escaped);
        free(model_escaped);
        return NULL;
    }

    snprintf(
        body,
        needed,
        "{"
        "\"model\":\"%s\","
        "\"messages\":["
        "{\"role\":\"system\",\"content\":\"%s\"},"
        "{\"role\":\"user\",\"content\":\"%s\"}"
        "],"
        "\"temperature\":0.2"
        "}",
        model_escaped,
        system_escaped,
        prompt
    );

    free(system_escaped);
    free(model_escaped);
    return body;
}

static int parse_http_status(char *output, int *status_out) {
    char *last_newline;
    char *status_text;

    last_newline = strrchr(output, '\n');
    if (!last_newline) {
        return 0;
    }

    status_text = last_newline + 1;
    if (strlen(status_text) < 3) {
        return 0;
    }

    *status_out = atoi(status_text);
    *last_newline = '\0';
    return *status_out > 0;
}

static int call_live_api(const char *task, const char *title, const char *course, const char *content, AiResponse *response) {
    const char *url = getenv("AI_PROVIDER_URL");
    const char *api_key = getenv("AI_API_KEY");
    const char *model = getenv("AI_MODEL");
    char *prompt = NULL;
    char *body = NULL;
    char *quoted_url = NULL;
    char *quoted_request_path = NULL;
    char *quoted_auth_header = NULL;
    char *command = NULL;
    char *output = NULL;
    char *content_text = NULL;
    char auth_header[512];
    char error[256] = "";
    int status = 0;
    int ok = 0;
    const char *request_path = "data/memocoach-ai-request.json";

    if (!url || !url[0] || !api_key || !api_key[0]) {
        return build_mock_response(task, title, course, content, response);
    }

    if (!model || !model[0]) {
        model = "default";
    }

    prompt = build_prompt(task, title, course, content);
    if (!prompt) {
        ai_set_error(response, "Out of memory building prompt");
        goto cleanup;
    }

    body = build_request_json(model, prompt);
    if (!body) {
        ai_set_error(response, "Out of memory building request JSON");
        goto cleanup;
    }

    if (!mc_write_file(request_path, body, error, sizeof(error))) {
        ai_set_error(response, error);
        goto cleanup;
    }

    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", api_key);
    quoted_url = shell_quote(url);
    quoted_request_path = shell_quote(request_path);
    quoted_auth_header = shell_quote(auth_header);
    if (!quoted_url || !quoted_request_path || !quoted_auth_header) {
        ai_set_error(response, "Out of memory quoting curl command");
        goto cleanup;
    }

    command = (char *)malloc(strlen(quoted_url) + strlen(quoted_request_path) + strlen(quoted_auth_header) + 220);
    if (!command) {
        ai_set_error(response, "Out of memory building curl command");
        goto cleanup;
    }

    snprintf(
        command,
        strlen(quoted_url) + strlen(quoted_request_path) + strlen(quoted_auth_header) + 220,
        "curl -sS --max-time 25 -w \"\\n%%{http_code}\" -H \"Content-Type: application/json\" -H %s --data @%s %s",
        quoted_auth_header,
        quoted_request_path,
        quoted_url
    );

    output = read_process_output(command);
    if (!output) {
        ai_set_error(response, "Cannot execute curl. Install curl or enable MEMOCOACH_AI_MOCK=1.");
        goto cleanup;
    }

    if (!parse_http_status(output, &status)) {
        ai_set_error(response, "Cannot parse HTTP status from provider response");
        goto cleanup;
    }

    if (status < 200 || status >= 300) {
        snprintf(response->error, sizeof(response->error), "AI provider returned HTTP %d: %.180s", status, output);
        goto cleanup;
    }

    content_text = json_extract_openai_content(output);
    if (!content_text) {
        snprintf(response->error, sizeof(response->error), "Could not find message.content in provider JSON: %.180s", output);
        goto cleanup;
    }

    response->text = content_text;
    content_text = NULL;
    response->used_mock = 0;
    snprintf(response->provider, sizeof(response->provider), "%s", url);
    ok = 1;

cleanup:
    remove(request_path);
    free(prompt);
    free(body);
    free(quoted_url);
    free(quoted_request_path);
    free(quoted_auth_header);
    free(command);
    free(output);
    free(content_text);
    return ok;
}

int ai_generate_for_note(const char *task, const char *title, const char *course, const char *content, AiResponse *response) {
    const char *mock = getenv("MEMOCOACH_AI_MOCK");

    memset(response, 0, sizeof(*response));

    if (mock && (strcmp(mock, "1") == 0 || mc_streq_ignore_case(mock, "true") || mc_streq_ignore_case(mock, "yes"))) {
        return build_mock_response(task, title, course, content, response);
    }

    return call_live_api(task, title, course, content, response);
}

void ai_response_free(AiResponse *response) {
    if (!response) {
        return;
    }
    free(response->text);
    memset(response, 0, sizeof(*response));
}
