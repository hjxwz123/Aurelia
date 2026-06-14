# Details

Date : 2026-06-14 23:52:31

Directory /Users/lidongyuan/Desktop/vue/chat/server

Total : 90 files,  19315 codes, 3355 comments, 1625 blanks, all 24295 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [server/cmd/api/main.go](/server/cmd/api/main.go) | Go | 154 | 35 | 22 | 211 |
| [server/go.mod](/server/go.mod) | XML | 20 | 0 | 4 | 24 |
| [server/internal/api/admin\_groups\_handlers.go](/server/internal/api/admin_groups_handlers.go) | Go | 99 | 6 | 13 | 118 |
| [server/internal/api/admin\_handlers.go](/server/internal/api/admin_handlers.go) | Go | 538 | 72 | 44 | 654 |
| [server/internal/api/admin\_redeem\_handlers.go](/server/internal/api/admin_redeem_handlers.go) | Go | 129 | 15 | 12 | 156 |
| [server/internal/api/admin\_uploads.go](/server/internal/api/admin_uploads.go) | Go | 184 | 91 | 18 | 293 |
| [server/internal/api/admin\_uploads\_test.go](/server/internal/api/admin_uploads_test.go) | Go | 34 | 0 | 5 | 39 |
| [server/internal/api/audio\_handlers.go](/server/internal/api/audio_handlers.go) | Go | 107 | 14 | 12 | 133 |
| [server/internal/api/auth\_handlers.go](/server/internal/api/auth_handlers.go) | Go | 389 | 48 | 37 | 474 |
| [server/internal/api/conversations\_handlers.go](/server/internal/api/conversations_handlers.go) | Go | 368 | 44 | 21 | 433 |
| [server/internal/api/errors.go](/server/internal/api/errors.go) | Go | 11 | 0 | 4 | 15 |
| [server/internal/api/files\_handlers.go](/server/internal/api/files_handlers.go) | Go | 290 | 73 | 15 | 378 |
| [server/internal/api/kbs\_handlers.go](/server/internal/api/kbs_handlers.go) | Go | 124 | 7 | 10 | 141 |
| [server/internal/api/memories\_handlers.go](/server/internal/api/memories_handlers.go) | Go | 75 | 4 | 9 | 88 |
| [server/internal/api/messages\_handlers.go](/server/internal/api/messages_handlers.go) | Go | 284 | 31 | 14 | 329 |
| [server/internal/api/middleware.go](/server/internal/api/middleware.go) | Go | 246 | 55 | 20 | 321 |
| [server/internal/api/models\_handlers.go](/server/internal/api/models_handlers.go) | Go | 80 | 12 | 10 | 102 |
| [server/internal/api/mux.go](/server/internal/api/mux.go) | Go | 88 | 3 | 14 | 105 |
| [server/internal/api/oauth\_handlers.go](/server/internal/api/oauth_handlers.go) | Go | 277 | 38 | 32 | 347 |
| [server/internal/api/projects\_handlers.go](/server/internal/api/projects_handlers.go) | Go | 189 | 11 | 13 | 213 |
| [server/internal/api/redeem\_handlers.go](/server/internal/api/redeem_handlers.go) | Go | 47 | 17 | 6 | 70 |
| [server/internal/api/router.go](/server/internal/api/router.go) | Go | 184 | 36 | 17 | 237 |
| [server/internal/api/session\_handlers.go](/server/internal/api/session_handlers.go) | Go | 59 | 11 | 7 | 77 |
| [server/internal/api/share\_handlers.go](/server/internal/api/share_handlers.go) | Go | 84 | 13 | 10 | 107 |
| [server/internal/api/twofa\_handlers.go](/server/internal/api/twofa_handlers.go) | Go | 142 | 22 | 14 | 178 |
| [server/internal/api/upload\_policy.go](/server/internal/api/upload_policy.go) | Go | 111 | 83 | 12 | 206 |
| [server/internal/api/user\_handlers.go](/server/internal/api/user_handlers.go) | Go | 156 | 17 | 14 | 187 |
| [server/internal/auth/auth.go](/server/internal/auth/auth.go) | Go | 105 | 18 | 14 | 137 |
| [server/internal/auth/totp.go](/server/internal/auth/totp.go) | Go | 75 | 12 | 11 | 98 |
| [server/internal/auth/totp\_test.go](/server/internal/auth/totp_test.go) | Go | 28 | 5 | 4 | 37 |
| [server/internal/cache/cache.go](/server/internal/cache/cache.go) | Go | 167 | 11 | 16 | 194 |
| [server/internal/cache/redis.go](/server/internal/cache/redis.go) | Go | 121 | 18 | 15 | 154 |
| [server/internal/config/config.go](/server/internal/config/config.go) | Go | 153 | 17 | 8 | 178 |
| [server/internal/llm/anthropic\_provider.go](/server/internal/llm/anthropic_provider.go) | Go | 504 | 67 | 27 | 598 |
| [server/internal/llm/compaction.go](/server/internal/llm/compaction.go) | Go | 266 | 69 | 20 | 355 |
| [server/internal/llm/deep\_research.go](/server/internal/llm/deep_research.go) | Go | 549 | 72 | 50 | 671 |
| [server/internal/llm/google\_provider.go](/server/internal/llm/google_provider.go) | Go | 361 | 38 | 18 | 417 |
| [server/internal/llm/httpclient.go](/server/internal/llm/httpclient.go) | Go | 17 | 10 | 3 | 30 |
| [server/internal/llm/memory\_worker.go](/server/internal/llm/memory_worker.go) | Go | 244 | 64 | 24 | 332 |
| [server/internal/llm/moderation.go](/server/internal/llm/moderation.go) | Go | 134 | 24 | 12 | 170 |
| [server/internal/llm/openai\_provider.go](/server/internal/llm/openai_provider.go) | Go | 795 | 97 | 30 | 922 |
| [server/internal/llm/openai\_responses\_test.go](/server/internal/llm/openai_responses_test.go) | Go | 43 | 4 | 4 | 51 |
| [server/internal/llm/orchestrator.go](/server/internal/llm/orchestrator.go) | Go | 1,068 | 262 | 89 | 1,419 |
| [server/internal/llm/param\_controls.go](/server/internal/llm/param_controls.go) | Go | 97 | 30 | 6 | 133 |
| [server/internal/llm/prompt\_tools.go](/server/internal/llm/prompt_tools.go) | Go | 187 | 62 | 19 | 268 |
| [server/internal/llm/quota.go](/server/internal/llm/quota.go) | Go | 110 | 22 | 12 | 144 |
| [server/internal/llm/registry.go](/server/internal/llm/registry.go) | Go | 48 | 20 | 10 | 78 |
| [server/internal/llm/task\_llm.go](/server/internal/llm/task_llm.go) | Go | 229 | 59 | 18 | 306 |
| [server/internal/llm/tool\_exec.go](/server/internal/llm/tool_exec.go) | Go | 37 | 9 | 6 | 52 |
| [server/internal/llm/types.go](/server/internal/llm/types.go) | Go | 117 | 43 | 15 | 175 |
| [server/internal/llm/util.go](/server/internal/llm/util.go) | Go | 42 | 5 | 4 | 51 |
| [server/internal/mail/mail.go](/server/internal/mail/mail.go) | Go | 211 | 19 | 23 | 253 |
| [server/internal/netsafe/netsafe.go](/server/internal/netsafe/netsafe.go) | Go | 77 | 17 | 7 | 101 |
| [server/internal/oauth/oauth.go](/server/internal/oauth/oauth.go) | Go | 369 | 47 | 27 | 443 |
| [server/internal/queue/queue.go](/server/internal/queue/queue.go) | Go | 75 | 22 | 10 | 107 |
| [server/internal/rag/embedder\_http.go](/server/internal/rag/embedder_http.go) | Go | 214 | 66 | 15 | 295 |
| [server/internal/rag/parser.go](/server/internal/rag/parser.go) | Go | 602 | 161 | 44 | 807 |
| [server/internal/rag/parser\_extract\_test.go](/server/internal/rag/parser_extract_test.go) | Go | 149 | 6 | 10 | 165 |
| [server/internal/rag/rag.go](/server/internal/rag/rag.go) | Go | 1,050 | 273 | 77 | 1,400 |
| [server/internal/sandbox/sandbox.go](/server/internal/sandbox/sandbox.go) | Go | 182 | 62 | 18 | 262 |
| [server/internal/sse/sse.go](/server/internal/sse/sse.go) | Go | 46 | 11 | 6 | 63 |
| [server/internal/storage/storage.go](/server/internal/storage/storage.go) | Go | 91 | 32 | 10 | 133 |
| [server/internal/store/channels.go](/server/internal/store/channels.go) | Go | 305 | 19 | 19 | 343 |
| [server/internal/store/conversations.go](/server/internal/store/conversations.go) | Go | 435 | 40 | 25 | 500 |
| [server/internal/store/ids.go](/server/internal/store/ids.go) | Go | 66 | 21 | 14 | 101 |
| [server/internal/store/kbs.go](/server/internal/store/kbs.go) | Go | 340 | 47 | 27 | 414 |
| [server/internal/store/misc.go](/server/internal/store/misc.go) | Go | 527 | 62 | 38 | 627 |
| [server/internal/store/models.go](/server/internal/store/models.go) | Go | 266 | 47 | 19 | 332 |
| [server/internal/store/oauth.go](/server/internal/store/oauth.go) | Go | 204 | 23 | 15 | 242 |
| [server/internal/store/pgcompat/pgcompat.go](/server/internal/store/pgcompat/pgcompat.go) | Go | 145 | 26 | 22 | 193 |
| [server/internal/store/pgcompat/pgcompat\_test.go](/server/internal/store/pgcompat/pgcompat_test.go) | Go | 23 | 5 | 3 | 31 |
| [server/internal/store/quotas.go](/server/internal/store/quotas.go) | Go | 110 | 11 | 9 | 130 |
| [server/internal/store/redeem\_codes.go](/server/internal/store/redeem_codes.go) | Go | 406 | 68 | 32 | 506 |
| [server/internal/store/schema.sql](/server/internal/store/schema.sql) | MS SQL | 337 | 37 | 28 | 402 |
| [server/internal/store/schema\_pg.sql](/server/internal/store/schema_pg.sql) | MS SQL | 336 | 15 | 27 | 378 |
| [server/internal/store/settings\_cache.go](/server/internal/store/settings_cache.go) | Go | 40 | 11 | 9 | 60 |
| [server/internal/store/shares.go](/server/internal/store/shares.go) | Go | 67 | 14 | 8 | 89 |
| [server/internal/store/skills\_projects.go](/server/internal/store/skills_projects.go) | Go | 277 | 22 | 18 | 317 |
| [server/internal/store/store.go](/server/internal/store/store.go) | Go | 163 | 39 | 15 | 217 |
| [server/internal/store/user\_groups.go](/server/internal/store/user_groups.go) | Go | 141 | 9 | 13 | 163 |
| [server/internal/store/users.go](/server/internal/store/users.go) | Go | 283 | 63 | 28 | 374 |
| [server/internal/tools/builtins.go](/server/internal/tools/builtins.go) | Go | 860 | 103 | 64 | 1,027 |
| [server/internal/tools/net\_safety.go](/server/internal/tools/net_safety.go) | Go | 18 | 12 | 6 | 36 |
| [server/internal/tools/registry.go](/server/internal/tools/registry.go) | Go | 67 | 14 | 9 | 90 |
| [server/internal/tools/sandbox\_settings.go](/server/internal/tools/sandbox_settings.go) | Go | 86 | 24 | 14 | 124 |
| [server/internal/tools/searcher.go](/server/internal/tools/searcher.go) | Go | 169 | 8 | 11 | 188 |
| [server/internal/tools/settings\_searcher.go](/server/internal/tools/settings_searcher.go) | Go | 53 | 25 | 7 | 85 |
| [server/internal/vector/qdrant.go](/server/internal/vector/qdrant.go) | Go | 270 | 45 | 23 | 338 |
| [server/internal/vector/vector.go](/server/internal/vector/vector.go) | Go | 48 | 28 | 10 | 86 |
| [server/migrations/0001\_init.sql](/server/migrations/0001_init.sql) | MS SQL | 241 | 5 | 21 | 267 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)