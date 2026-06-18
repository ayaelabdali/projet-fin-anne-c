cmake_minimum_required(VERSION 3.16)
project(memocoach_ai C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

find_package(SQLite3 REQUIRED)

add_executable(memocoach
    src/main.c
    src/ai_client.c
    src/db.c
    src/json_utils.c
    src/util.c
)
target_include_directories(memocoach PRIVATE include)
target_link_libraries(memocoach PRIVATE SQLite::SQLite3)

enable_testing()

add_executable(test_json_utils
    tests/test_json_utils.c
    src/json_utils.c
    src/util.c
)
target_include_directories(test_json_utils PRIVATE include)
add_test(NAME json_utils COMMAND test_json_utils)

add_executable(test_db
    tests/test_db.c
    src/db.c
    src/util.c
)
target_include_directories(test_db PRIVATE include)
target_link_libraries(test_db PRIVATE SQLite::SQLite3)
add_test(NAME db COMMAND test_db)

add_executable(test_ai_client
    tests/test_ai_client.c
    src/ai_client.c
    src/json_utils.c
    src/util.c
)
target_include_directories(test_ai_client PRIVATE include)
add_test(NAME ai_client COMMAND test_ai_client)
