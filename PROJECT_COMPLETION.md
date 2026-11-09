# SmartDrive Project Completion

Updated: 2026-11-09

This is the working completion roadmap. “Complete” means locally implemented and verified as described; it does not imply a live production integration has been verified.

## Architecture overview

- **Frontend:** React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind, and shared shadcn-style components. Feature modules live under `frontend/src/features`.
- **Backend:** FastAPI, Pydantic, Motor/MongoDB, bearer sessions, repository/service layers, and owner-scoped routes. Receipt and vehicle-image bytes use private GridFS storage. Local OCR uses Tesseract and PDFium.
- **AI:** The schedule score remains local and rule-based. Optional maintenance research uses Tavily and Gemini with source checks and a scoped MongoDB cache. The vehicle Insights page also has a read-only conversation assistant with selective Tavily search, structured record/source/interpretation answers, scoped persistent conversations, and usage controls.
- **Configuration:** Backend precedence is process environment > `backend/.env.local` > `backend/.env` > defaults in development. `APP_ENV=production` must come from the process environment; in production the backend ignores dotenv files. Frontend `frontend/.env.local` is Vite-only and contains public `VITE_*` configuration.
- **Hosting:** Frontend is configured for Vercel, backend for Render via Docker, and MongoDB Atlas is external. Production credentials, networking, persistence, and provider calls require verification in the user’s deployed environment.

## Feature completion matrix

| Feature | Status | What exists / what remains |
| --- | --- | --- |
| Registration and sign-in | NEEDS VERIFICATION | Password hashing, stored/revocable sessions, auth endpoints and frontend flows exist. Session revocation/expiry unit coverage is in place; verify against the deployed database. |
| Vehicle garage and details | NEEDS VERIFICATION | Owner-scoped vehicle CRUD, soft delete, searchable local make/model catalog, responsive forms, private photo storage, a premium Garage with search/grid/list views and live statistics, and a five-tab vehicle dashboard exist. Cross-user CRUD, replacement cleanup, deployed GridFS behavior, and visual viewport review remain. |
| Service visits and history | NEEDS VERIFICATION | Visit/item CRUD, due schedules, status calculations, desktop table/mobile cards, detail actions, receipt links, and add-service actions exist. Partial-edit preservation, owner-scoped deletion, and history ordering/totals have unit coverage; verify the browser workflow and persistent CRUD. |
| Receipts and OCR | NEEDS VERIFICATION | Private GridFS upload, authenticated access, local image/PDF OCR, editable draft, and post-save receipt attach/retry flow exist. Parser and storage unit tests pass; real OCR quality, GridFS persistence, and full save/retry journey need integration verification. |
| Dashboard | NEEDS VERIFICATION | Connected vehicle and maintenance summaries with bounded photos exist. Verify the authenticated journey and empty/error states on desktop/mobile. |
| Rule-based maintenance score | COMPLETE (local logic) | Six areas, saved due schedules, 100/70/30 thresholds, exclusion of missing data, minimum two eligible areas, and non-diagnostic explanation are implemented. It does not use an LLM. UI/browser behavior lacks automated tests. |
| LLM maintenance research | LOCALLY IMPLEMENTED; MOCKED TESTS PASS; LIVE UNVERIFIED | Authenticated POST and cache-only GET, owner-scoped minimized context, bounded Tavily/Gemini inputs, explicit source vehicle matching, per-user/per-vehicle 24-hour cache keys, Mongo-backed 60-second provider cooldown, generic provider errors, and refresh restoration are implemented. Mock/unit tests pass. Live provider calls, Mongo integration, browser journey, and the Docker Python 3.13 runtime remain unverified. |
| Vehicle conversational assistant | LOCALLY IMPLEMENTED; MOCKED TESTS PASS; LIVE UNVERIFIED | Read-only authenticated chat, owner/vehicle-scoped conversations, 90-day inactivity retention, 100-turn limit, idempotent messages, 20-per-UTC-day user quota, 10-second per-vehicle cooldown, bounded history/context, selective Tavily lookup, source/record validation, and Insights UI are implemented. Live Gemini/Tavily, real Mongo persistence/indexes/limits, browser workflows, and Python 3.13 Docker runtime remain unverified. |
| Workshops, analytics, fleet, profile, settings | NOT IMPLEMENTED (deferred) | Placeholder destinations have been removed from navigation and unknown unfinished routes no longer masquerade as working pages. Implement only if included in a later product scope. |
| Production readiness | PARTIALLY COMPLETE | Docker/Vercel/Render configuration, environment guidance, Mongo-pinging health endpoint, and private GridFS design exist. Verify production CORS/secrets, Atlas access, durable backups/restore, monitoring, retention/account deletion policy, and smoke journeys. |

## Initial audit findings

- Auth, garage, service history, receipt/photo GridFS and OCR, and rule-based score were present, but had limited automated coverage.
- Health previously reported MongoDB as healthy without pinging it; maintenance context did not retain the latest service mileage.
- Several linked destinations were placeholders.
- The backend research prototype was not connected to the frontend; its cache service/provider interfaces were mismatched and it omitted saved maintenance history. OpenAI support was unfinished.
- Documentation disagreed on whether the maintenance score and generated guidance were MVP features. The score is now documented as local schedule tracking; LLM research is optional and credential-gated.
- The repository initially had no backend tests and no frontend component-test runner.

## Prioritized roadmap

### Phase 1 — Correctness and safety: COMPLETE

- [x] Make `/health` ping MongoDB and return 503 if unavailable.
- [x] Correct latest maintenance mileage and avoid negative distance for inconsistent odometers.
- [x] Remove unfinished destinations from navigation and show a clear unavailable route.
- [x] Add initial backend unit coverage and clear frontend lint errors.

### Phase 2 — Core journey and data integrity: IN PROGRESS

- [x] Add tests for maintenance due status and creation, receipt file validation/OCR uncertainty/ownership/visit attachment/metadata rollback, vehicle ownership/soft-delete, and photo access/replacement.
- [x] Add tests for session revocation/expiry lookup, service visit edit/delete/history consistency, and the frontend receipt retry journey.
- [x] Add Garage metric/search tests and expose optional plate/fuel/transmission fields in the existing vehicle-list response for search and list presentation.
- [ ] Add GridFS integration tests.
- [ ] Verify real Tesseract/PDF scan behavior and GridFS round trips against a test database.
- [ ] Verify responsive browser workflows and record a production-like smoke procedure.

**Affected areas:** `backend/app/routes`, `services`, `repositories`, GridFS/OCR modules, and the frontend garage, maintenance, and receipt flows.

**Risks:** MongoDB/GridFS and browser workflows require integration-level setup; do not interpret parser/storage unit tests as proving cloud persistence or OCR accuracy.

**Acceptance:** Critical owner journeys persist after reload; users cannot access other users’ resources; upload/scan/attach retry behavior is recoverable; automated regression checks pass.

### Phase 3 — LLM research integration: IMPLEMENTED LOCALLY, NEEDS LIVE VERIFICATION

- [x] Align provider interfaces and route through the normalized knowledge-cache service.
- [x] Include reduced vehicle history and current mileage in the Gemini prompt without costs or identifying account/vehicle registration data.
- [x] Instruct the model to treat source text as untrusted, not to infer from missing service records, and to use only supplied source evidence.
- [x] Validate exact cited URLs, allowed source domains, and vehicle matches; return normalized structured results only.
- [x] Cache by identity, current mileage, and relevant history for 24 hours; add TTL index and same-process in-flight deduplication.
- [x] Scope cache and in-flight request keys to authenticated user and vehicle as well as vehicle identity, mileage, and maintenance-history digest; bump the cache schema version.
- [x] Require explicit make/model source match and reject conflicts in supplied year, variant, or transmission details.
- [x] Restore valid cached research through an authenticated cache-only endpoint without triggering providers on page load.
- [x] Add a Mongo-backed 60-second per-user/per-vehicle cooldown for provider-backed cache misses; cache hits bypass it and storage failures fail closed.
- [x] Bound Tavily result count/content, validate result limits, cap assembled Gemini prompt, and add a 110-second backend research deadline.
- [x] Avoid logging raw search queries/result text and return generic provider errors to clients.
- [x] Add frontend initiation, timeout/abort handling, duplicate prevention, loading/empty/error states, and source-linked recommendations, separated from the local score.
- [x] Explicitly reject OpenAI configuration because that provider is not implemented.
- [ ] Verify configured Tavily/Gemini calls, real async deadline/retry behavior, Mongo cache read/write/TTL/cooldown, and endpoint access in a non-production integration environment.

**Affected areas:** `backend/app/ai`, `backend/app/routes/ai.py`, Mongo repository/index, frontend Maintenance page/API/types, `.env.example`, and AI/API docs.

**Risk/limitation:** External calls and provider credentials have not been exercised here. Current allowed source domains are deliberately narrow, so valid research can return empty guidance. Do not market outputs as diagnosis or guaranteed manufacturer service schedules.

**Acceptance:** With credentials configured, owner can request evidence-based guidance; results cite allowed sources and match the selected vehicle; saved history is considered; cache and provider errors are handled without presenting unsupported claims.

### Vehicle-specific conversational assistant: IMPLEMENTED LOCALLY, NEEDS INTEGRATION VERIFICATION

- [x] Add owner- and active-vehicle-scoped conversations and turns with idempotent message IDs, expiry indexes, and permanent per-conversation deletion.
- [x] Build minimized context from vehicle engine/specifications, recent recorded maintenance, and still-valid cached research; keep costs, notes, receipts, VIN, registration, account data, and other vehicles out of prompts.
- [x] Route record-only questions through Gemini without Tavily; search only when Gemini requests external evidence, using at most three bounded Tavily queries.
- [x] Return separate validated saved-record references, externally researched source-linked claims, interpretation, and evidence limitations. Reject unknown record references and unapproved/mismatched source URLs.
- [x] Enforce message/history/prompt/turn limits, a 20-attempt per-user UTC-day quota, 10-second per-user/vehicle cooldown, and 110-second backend deadline; fail closed if Mongo limit storage is unavailable.
- [x] Add responsive Insights chat with selected-vehicle context, saved chat switching, URL restoration, suggested questions, retry/idempotency handling, and confirmed deletion while preserving the existing research guidance panel.
- [x] Document the API, privacy exclusions, retention, usage limits, and read-only boundary.
- [ ] Verify Mongo indexes/TTL and concurrent quota/cooldown behavior against a non-production database; run authenticated browser workflows and live provider checks if credentials are configured.

**Risk/limitation:** The existing source allowlist remains narrow. A model can still produce misleading interpretation, so responses are informational, citations are filtered to known evidence, and no mechanical diagnosis or automatic action is permitted. Live integrations and browser behavior are not verified by unit tests.

### Phase 4 — Release readiness and documentation: IN PROGRESS

- [x] Document current MVP and optional research credential requirements; update API, architecture, database, and local setup docs.
- [x] Replace the basic vehicle detail layout with a URL-backed five-tab ownership dashboard; reuse the rule score and research UI, plot actual dated service mileage, and make the Documents tab manage existing receipts with clear limits.
- [x] Redesign Garage with live user-scoped visit/schedule counts, plate-aware search, persisted grid/list views, responsive vehicle cards, dedicated add/empty states, and existing add/edit/soft-delete workflows.
- [x] Redesign Dashboard with live garage/service statistics, recent vehicle cards, the existing per-vehicle maintenance score rules, current schedule status, urgency-sorted upcoming/overdue items, and real service-mileage trends.
- [x] Remove the unused, unfinished OpenAI prototype and its direct dependency/configuration so only the actually supported Gemini/Tavily research provider is presented.
- [x] Make backend dotenv loading consistent for local development and add a production-mode guard that skips dotenv files; add settings precedence tests and an opt-in loopback-only Mongo integration suite.
- [x] Document disposable local MongoDB, manual provider verification, browser verification, and Docker/Python 3.13 procedures.
- [ ] Reconcile remaining older docs and verify README instructions against current repository behavior.
- [ ] Configure and verify production environment, Atlas access, backups/restore, monitoring, CORS, privacy notice, and data deletion/retention.
- [ ] Run production-like smoke checks for deploy, auth, vehicle/photo, service/receipt, and optional research.

## Verification record

Latest local verification (2026-11-09):

- Backend: `python -B -m unittest discover -s tests` — **80 tests passed** in the local Python 3.14.3 virtual environment with declared requirements installed. This includes mocked assistant provider, authorization, quota/cooldown, cache citation, idempotency, and backend dotenv precedence/production guard coverage. The Docker runtime targets Python 3.13; that runtime was unavailable, so the exact runtime match is not verified.
- Backend AI coverage is mocked/unit-only: provider request/response parsing, routing, bounds, source and record validation, authorization, usage-control decisions, and failure paths. This does not establish live provider, real Mongo, or full ASGI integration behavior.
- Frontend: `npm test` — **14 tests passed**. `npm run typecheck` and `npm run build` passed. `npm run lint` — **0 errors, 5 React Hook Form compatibility warnings**. Build reports the existing Vite `__dirname` advisory and large JavaScript chunk advisory.
- Live provider status: **not run**. Gemini and Tavily credentials are absent from the local environment. No provider success is claimed.
- Live Mongo/cache status: **not verified**. No isolated non-production database integration run was available. Mongo cooldown/cache behavior is covered with mocked/unit repository tests only.
- Mongo integration suite: prepared at `backend/tests/integration/test_ai_mongodb_integration.py`; discovery without explicit test URI/database correctly skips it. A real run requires a loopback MongoDB service and a `smartdrive_test_*` database. No database was changed during this verification.
- Frontend research flow: API helper tests and code review verify encoded vehicle IDs, authenticated shared Axios client usage, 204 cache-miss handling, and cache hydration without provider calls. No authenticated browser session was run.
- Assistant frontend tests cover vehicle-scoped API paths, conversation selection, and URL persistence helpers. `npm run typecheck`, lint, and production build pass; lint reports five existing React Hook Form compatibility warnings. Chat UI, mobile layout, actual sending/loading/retry/deletion, and authenticated browser navigation have not been browser-verified.
- Timeout status: mocked provider tests verify timeout parameters and retry wiring, but the actual 110-second async cancellation/deadline was not exercised in this Windows test host.
- Maintenance score: existing calculation was not changed; added regression tests pass for 100/70/30 statuses, missing schedules, and the two-area minimum.
- Vehicle details redesign: code/build verified; no authenticated browser viewport test was run, so visual desktop/tablet/mobile acceptance remains unverified.
- Garage redesign: production build and search/stat unit tests pass; no authenticated browser viewport test was run, so image/card sizing still needs visual review at desktop/tablet/mobile widths.
- Dashboard redesign: production build and dashboard schedule/stat tests pass; no authenticated browser viewport test was run, so responsive visual acceptance remains unverified.
- Not verified: live Atlas/GridFS, Tesseract/PDFium end-to-end, browser-driven workflows, or Tavily/Gemini calls. The current local Windows asyncio harness is unsuitable for reliable task-creating async integration tests; use a normal CI/runtime test environment for those checks.
- Previous completed work was pushed in commit `3426f4f`; the current Garage redesign is uncommitted and has not been pushed.

## Execution log

### Initial audit — 2026-11-09

- Inspected the repository structure, README/docs, requirements, config/environment examples, recent commits and Git status, frontend routes/API/features, backend routes/services/repositories, and AI/search integrations before code changes.
- Working tree was clean and aligned with `origin/master` at audit start. No tests existed at that point.

### Phase 1 — 2026-11-09

- Corrected Mongo-aware health, maintenance mileage context, and placeholder routing/navigation. Added initial backend tests and resolved frontend lint errors.

### Phase 2 and Phase 3 implementation — 2026-11-09

- Added local unit coverage for session token storage/lifetimes, maintenance status/create, analyzer history, receipt scan parsing, file signatures/limits, receipt attachment/rollback and ownership, vehicle ownership/soft-delete, photo replacement/access, research prompt/history, source/vehicle validation, cache keys, and cache-hit behavior.
- Implemented the frontend research action and wired it to the authenticated normalized backend result; supplied history context to Gemini and added validated-profile caching.
- Added a lazy provider lookup so a valid cached profile remains available even if external providers are not configured or are temporarily unavailable.
- Replaced the basic vehicle detail page with Overview, Service History, Maintenance, Insights, and Documents tabs. Tabs update the query string for browser history, service-history edit/delete and receipts are retained, mileage chart data comes from recorded service visits only, and the documents view uses the existing receipt APIs.
- Extracted the existing score calculation and presentation for reuse; the redesign keeps the score rules unchanged and keeps Gemini research separate.
- Removed the unreferenced unfinished OpenAI implementation and its direct package/environment settings.
- Updated deployment/API/architecture/database/MVP/local-development documentation. Live services remain unverified pending credentials and test environment.

### Phase 1 research verification and fixes — 2026-11-09

- Independently traced README and completion claims through the route, settings, provider implementations, context builder, history summarizer, cache repository, auth dependency, Insights UI, and shared authenticated API client. The actual Tavily → Gemini interfaces aligned; the assessment was broadly accurate but missed user/vehicle cache scoping, optional source matching, absent refresh restoration, and absent provider cooldown/input bounds.
- Required explicit source make/model match; additionally reject incompatible optional year, variant, or transmission, and require a credential-free HTTP(S) URL.
- Versioned and scoped cache/in-flight keys by authenticated user and vehicle plus relevant vehicle/history inputs. Added authenticated cache-only reads returning 204 on a miss, and frontend cache restoration without auto-research.
- Added a Mongo-backed per-user/vehicle 60-second provider-miss cooldown, bounded Tavily/Gemini inputs, capped the assembled prompt, set a 110-second total backend deadline, and removed raw provider query/result text from logs.
- Added mocked/unit tests. Python 3.14.3 local run: 56 backend tests pass; frontend: 11 tests pass, typecheck/build pass, lint has zero errors and five compatibility warnings. No live provider credentials were present; provider and Mongo integrations were not run. Actual async timeout behavior and Python 3.13 Docker runtime remain unverified.
- Maintenance score calculation stayed unchanged and its regression tests pass. No commit or push was made.

### Phase 2 conversational assistant implementation — 2026-11-09

- Added structured chat routing and answer-generation methods to the existing Gemini integration; expanded the current Tavily provider with bounded user-question searches rather than adding a new provider stack.
- Added owner-scoped conversation and turn storage, UUID idempotency, confirmed per-chat deletion, 90-day inactivity expiry, and Mongo-backed daily and per-vehicle usage controls.
- Built vehicle context with engine, fuel/transmission, up to 60 recent item records, a truncation indicator, and an available valid research cache profile. Prompts omit account data, VIN/registration, receipt data, item notes, and cost values.
- Added backend filtering of model record references and external claims/citations, plus records-only fallback on Tavily failure. The assistant has no vehicle/service write operations.
- Added a responsive Insights assistant with multiple saved chats, selected-vehicle URL state, suggested prompts, citation links, idempotent retry, and a separate existing research-guidance view.
- Added mocked provider, service, authorization, limits, structured output, source validation, and frontend routing-helper tests. Live providers, Mongo integration, and browser interactions remain unverified.
- Final code review found and fixed an undefined source-allowlist variable in the existing Gemini maintenance-research validator, which could fail when processing a cited guidance item. Added a regression test proving fabricated URLs are dropped while supplied citations remain.
- Final verification: 77 backend tests and 14 frontend tests pass; frontend typecheck and build pass; lint reports five existing compatibility warnings. No live provider credentials or isolated MongoDB test database were available. No commit or push was made.

### Environment configuration and integration readiness — 2026-11-09

- Root cause: `SettingsConfigDict` named only `.env`, while the existing local config file was `.env.local`. Vite's `.env.local` behavior is independent and did not configure the backend. The backend example and local-development docs were aligned with the actual loader.
- Added backend development precedence: process env > `.env.local` > `.env` > defaults. Production dotenv files are skipped when `APP_ENV=production` is set outside dotenv; dotenv files cannot select production mode. Added unit tests for precedence and production isolation. Existing environment files were not overwritten or printed.
- Added an opt-in real MongoDB repository/context integration suite guarded by explicit test variables, loopback-only URI validation, and a required `smartdrive_test_` database name. It covers persistence across repository instances, deletion, owner/vehicle isolation, context/history isolation, cache expiry/schema/scoping, cooldown, quota, retention and TTL/index setup. It skips without explicit test configuration; no real MongoDB suite was run because Docker/MongoDB are absent and localhost:27017 is not listening.
- Added `docs/12_END_TO_END_VERIFICATION.md` with local setup, disposable MongoDB commands, manual paid-provider procedure, authenticated two-account/two-vehicle browser checklist, and Docker/Python 3.13 verification commands. Updated README and local development docs. The repository has no Compose file.
- Live Gemini/Tavily was not run: backend provider keys are blank. Docker build was attempted but blocked because the `docker` command is unavailable. Local Python is 3.14.3, not the Docker target 3.13. Authenticated browser testing was blocked because the API cannot complete its local MongoDB startup.
- Removed frontend logging of the API base URL and changed AI research failure logs to avoid raw upstream exception text. Automated backend and frontend checks are recorded above; these do not substitute for the blocked integrations. No commit or push was made.

### Garage redesign — 2026-11-09

- Replaced the basic vehicle list with a dark automotive hero, red accent styling, actual Garage statistics, responsive toolbar, and grid/list collection views.
- Added local plate-aware search, browser-persisted view preference, empty/loading/error/no-result states, and a repeated Add Vehicle action tied to the existing form.
- Lazy-loads vehicle photos as cards approach the viewport, while retaining eager loading for the vehicle details hero and edit-photo preview.
- Reworked vehicle cards to show actual private/external photos, vehicle metadata, status, details, edit, and confirmed soft-delete actions. The list API now includes optional plate, fuel and transmission fields without requiring per-vehicle fetches.
- Added unit coverage for Garage counts/search and backend list-response compatibility with older records. Built the frontend and ran lint, typecheck, frontend tests, and the backend suite; visual authenticated viewport review remains.

### Dashboard redesign — 2026-11-09

- Replaced the basic Dashboard with a responsive dark/red automotive overview using user-scoped vehicle and service-visit queries.
- Added distinct vehicle/service-record/upcoming/overdue metrics, vehicle shortcuts, per-vehicle maintenance health reusing the saved-schedule score rules, and latest-schedule status distribution.
- Added upcoming and overdue maintenance lists ordered by due urgency, with routes into the relevant vehicle maintenance tab.
- Added a mileage chart based on actual dated service visit mileage for the selected vehicle; no mileage is combined across different vehicles.
- Added unit coverage for deduplication, current-garage filtering, latest schedules, status buckets, and urgency ordering. Frontend build and all 7 tests pass; lint has no errors. Authenticated browser visual review remains.

### Phase 1 and Phase 2 final integration verification — 2026-11-09

**Environment discovered:** `backend/Dockerfile` targets `python:3.13-slim`, installs Tesseract plus English language data, installs `backend/requirements.txt`, and starts Uvicorn on `PORT` (default 8000). Frontend uses Node/Vite and `VITE_API_URL`. `docs/11_LOCAL_DEVELOPMENT.md` documents backend `.env`, local MongoDB at `127.0.0.1:27017`, backend Uvicorn on port 8000, and Vite on port 5173. The backend settings load `.env`; they do not load `.env.local`. In this machine, only `backend/.env.local` and `frontend/.env.local` are present; backend `.env.local` has blank Gemini/Tavily credentials. Its Mongo target is local, but nothing is listening on port 27017. Docker, mongod, and mongosh are unavailable. The local Python runtime is 3.14.3, not the Docker 3.13 runtime. No remote database was contacted.

| Area | Test method | Result | Evidence | Outstanding issue |
| --- | --- | --- | --- | --- |
| Automated backend checks | Python unit suite, declared dependencies in local venv | PASS — 77 tests | `python -B -m unittest discover -s tests` | Mock/unit tests do not establish external services or real persistence. |
| Automated frontend checks | Node test suite, typecheck, lint, production build | PASS with advisories — 14 tests; typecheck/build passed; lint 0 errors and 5 compatibility warnings | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` | Tests are utility/data tests rather than authenticated component/browser journeys. Build reports existing `__dirname` and large-chunk warnings. |
| Backend app/runtime initialization | Import app and generate FastAPI OpenAPI schema on Python 3.14.3 | PASS — 21 paths, assistant path templates present | `app.openapi()` succeeded | Uvicorn startup with Mongo-backed lifespan was not verified. |
| Real MongoDB integration | Local TCP availability check; no external connection | NOT RUN / BLOCKED | `127.0.0.1:27017` is not listening; Docker and MongoDB tools are absent; configured development target is local | Conversation/cache persistence, TTL indexes, isolation, cooldowns, restart recovery and deletion must be tested against an isolated database. |
| Live Gemini and Tavily | Credential presence checked without displaying values | NOT RUN / BLOCKED | `GEMINI_API_KEY` and `TAVILY_API_KEY` are blank in the backend local environment | No live connectivity, structured response, source matching, provider timeout/failure, or live quota test is claimed. |
| Authenticated browser workflows | Code review and frontend helper tests; no test login/data configured | NOT RUN / BLOCKED | API base is local, but backend cannot start its Mongo lifespan; no browser session or isolated test user/vehicles available | Login, Garage→Insights, research/chat, citations, refresh restore, retry, deletion, ownership denial and cross-vehicle switching still need browser verification. |
| Cross-vehicle isolation | Ownership/context/cache code review plus mocked tests | MOCKED/CODE REVIEW ONLY | Vehicle context is queried by active vehicle and user; conversation operations include owner and vehicle; research cache key includes user and vehicle IDs | Must verify using two isolated test vehicles and two test accounts against real Mongo and providers. |
| Docker/Python 3.13 | Attempted project Docker build | BLOCKED | `docker build -f backend/Dockerfile ...` could not run because `docker` is not installed; only Python 3.14.3 is installed | Install/use Docker or a Python 3.13 CI environment and execute the documented build, startup and health checks. |
| Security review | Static review of auth dependencies, AI routes/services, data context, schemas, provider bounds and UI | PASS at code-review level; integration unverified | Routes depend on authenticated user; vehicle/conversation access is scoped; user content is bounded; prompts omit VIN/registration/receipts/costs/notes/account data; citation and record IDs are backend-filtered; assistant has no write APIs | Runtime authorization and cross-user denial need real authenticated integration tests. External providers still receive minimized vehicle details and maintenance descriptions when enabled. |

During review, removed a frontend console statement that printed the configured API base URL and changed maintenance-research route logs to record exception types rather than raw upstream exception text. These changes were followed by the passing automated suites above. The API URL was not a credential, but removing configuration logging avoids unnecessary endpoint disclosure. Provider and Mongo checks were intentionally not pointed at a remote environment because the available setup did not establish that it was an isolated test database.

**Local development setup:** Copy `backend/.env.example` to `backend/.env` (this is the filename Pydantic actually reads), set a unique development `JWT_SECRET`, keep `MONGODB_URI` pointed at a local/test-only database, and provide provider keys only in that backend file if live tests are authorized. Start local MongoDB, activate/install the documented backend requirements, run `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` from `backend`, then run `npm install` and `npm run dev` from `frontend` with `VITE_API_URL=http://127.0.0.1:8000`. Do not copy production credentials/data into a QA setup.

**Conclusion:** Phase 1/2 logic is locally implemented and its mocked/unit suites pass, but the complete realistic end-to-end objective is **not established**. Do not call either AI feature production-verified until isolated MongoDB, live provider, Docker 3.13 and authenticated browser/cross-vehicle checks pass.

### Phase 3 research-based predictive preventive maintenance — 2026-11-09

- Added a versioned predictive-report and knowledge-entry schema. Automated entries retain vehicle applicability, component, applicability bounds when returned, evidence summary, validated sources, confidence, retrieval time, model/schema/revision values, and an explicit `UNREVIEWED_AUTOMATED_RESEARCH` state. They are cached outputs, not permanent curated knowledge.
- Added deterministic backend candidate selection, bounded to three components. At most one slot is reserved for an overdue schedule (or one upcoming schedule when there is no overdue item); remaining slots prioritize recorded component history and then general preventive lookup. Missing history is represented as unknown; item notes, costs, receipts, VIN, registration and account data are excluded.
- Reused current Tavily/Gemini providers, authenticated ownership checks, source validator and Mongo `maintenance_knowledge` cache/cooldown. Gemini analyzes backend-selected candidates only. An analysis is exposed only when its exact cited URL belongs to that candidate's search results, the source passes existing domain/vehicle matching, and its exact quote is present in the supplied result text.
- Backend assigns attention labels. A saved overdue schedule is `HIGH_PRIORITY` with schedule-only wording; upcoming recorded schedules and accepted source-matched excerpts are `MONITOR`; absent/invalid evidence is `INSUFFICIENT_DATA`. The automated flow does not assign `INSPECT`, because snippet text alone cannot establish that inspection is appropriate. These labels are not failure probabilities or a diagnosis. Existing Maintenance Score calculations were not changed.
- Added authenticated `GET /ai/predictive-maintenance/{vehicle_id}/cached` (204 on miss) and `POST /ai/predictive-maintenance/{vehicle_id}` (`refresh` request option). Reports are scoped by owner, vehicle, identity, engine, mileage, component history, knowledge model/revision and schema; 24-hour TTL and existing Mongo cooldown apply.
- Added a responsive Predictive Maintenance panel to Vehicle Insights with actual report counts, categorized component cards, saved service context, data gaps, source links, cache restoration, refresh, and loading/error/empty states. Existing assistant and research guidance remain available.
- Added backend unit coverage for deterministic candidate ordering, unknown missing-history semantics, schedule attention categories, exact-quote/source/vehicle validation, cache-key isolation, route authentication, cache-only misses, and ownership rejection. Added frontend API path and cache-miss tests; the repository has no mounted React component test framework.
- **Verification status at initial Phase 3 implementation:** Python 3.14 `unittest discover -s tests`: 90 passed, 1 real-Mongo integration class skipped because test Mongo settings were absent. `compileall` and FastAPI OpenAPI generation passed (23 paths, including both predictive endpoints). Frontend: 16 tests passed, typecheck passed, production build passed, lint had 0 errors and 5 existing React Hook Form compatibility warnings. Vite also reported the existing `__dirname` compatibility and large-chunk warnings. No Gemini/Tavily calls were made; live providers, real MongoDB, authenticated browser, and Docker/Python 3.13 remained unverified. No commit or push was made.
- **Known limitations:** Existing source allowlists are intentionally narrow (Perodua official domains plus the current specialist set), so many makes may produce insufficient data. Tavily's current result schema may omit publication dates. Candidate selection is deterministic but does not infer component failures from age/mileage alone. Automated inspection classification is reserved; an exact matched excerpt is not sufficient evidence to assign it. The local Windows Python 3.14 harness stalls when attempting a full `asyncio.run` provider flow, so prompt bounds, exact-quote/source validation, deterministic categories, routes and cache reads were tested separately; the full async provider orchestration still needs execution under the project's Python 3.13 Linux/Docker runtime.
- **Next development step:** run the complete mocked backend/frontend suites and verify OpenAPI/UI production build; then, in a disposable isolated environment, execute the existing Phase 1/2 Mongo/provider/browser runbook extended with these Phase 3 cache, exact quote, source-domain and attention-category cases. Expand source allowlists only with separately reviewed primary technical references and tests.

### Phase 3.5 predictive maintenance quality validation — 2026-11-09

- **Confirmed:** the original rank-first candidate selector could let three overdue groups occupy all search slots. It now reserves at most one overdue schedule (or one upcoming schedule when none are overdue), then gives remaining slots to history-led or general component research. Other overdue schedules remain in the existing Maintenance workflows.
- **Confirmed:** vehicle identity did not carry engine or generation, and source matching did not validate them. Identity now carries known engine and an optional generation read from stored vehicle data; explicit source engine/generation matches fail closed when the local value is missing or conflicts. Existing vehicle forms do not collect generation, so generation-specific evidence will be rejected unless that value exists in stored data. General sources that omit engine/generation remain lower-confidence matches rather than being presented as engine-specific.
- **Confirmed:** exact excerpt matching proves only that the text appeared in a Tavily result. It does not prove source authenticity, semantic support, or automotive correctness. The Gemini schema now accepts only candidate keys, URLs, and exact excerpts; free-form findings, concerns, recommendations, intervals, applicability ranges and confidence are no longer surfaced. Cards show a backend-written caution and call the text “source-matched excerpts.”
- Automated reports no longer assign `INSPECT`; an excerpt containing inspection language is not enough to establish that inspection is appropriate. `HIGH_PRIORITY` remains limited to overdue saved schedules, with schedule-only wording; upcoming schedules and accepted excerpts are `MONITOR`; rejected/no evidence is `INSUFFICIENT_DATA`. Confidence is labeled as source/applicability fit, not technical accuracy; recorded schedule confidence is described separately.
- Bumped predictive knowledge model/revision/schema to v1.1/2/2 so old cached reports cannot restore prior prose/categories. The key already includes owner, vehicle, identity, mileage, date and saved history; engine and generation are now in identity. Existing repository expiry checks require both the current schema and `expires_at > now`; cache-only GET remains provider-free, normal POST restores valid cache, explicit refresh bypasses it, and TTL remains 24 hours.
- Added synthetic unit cases for multiple overdue groups, complete/partial/recent histories, unsupported make/model, engine/generation mismatches, unsupported provider prose, cache expiry and knowledge revision invalidation. The existing Maintenance Score tests remain unchanged and pass.
- **Environment verification:** `py -0p` lists only Python 3.14; `docker` is unavailable. Thus the intended Python 3.13 asynchronous provider orchestration cannot be exercised here. MongoDB is not configured for this test run, no live Tavily/Gemini calls were made, and no authenticated browser workflow was available. These remain distinct unverified integration areas.
- **Phase 3.5 verification matrix:**

  | Area | Method | Result | Evidence / outstanding limitation |
  |---|---|---|---|
  | Candidate selection, applicability, classification, cache keys/expiry, unsupported vehicle, history scenarios | Code review plus mocked deterministic `unittest` cases | PASS | Includes multiple overdue schedules, complete/partial/recent records, unknown history, make/model and engine/generation mismatch, cache scope/revision/schema/24-hour expiry, and backend categories. |
  | Mocked provider boundary | Mocked Gemini schema/prompt and result validation tests | PASS, partial workflow | Verifies bounded untrusted input, no free-form Gemini findings/recommendations, exact URL/quote checks and vehicle/source matching. Full async provider orchestration was not exercised. |
  | Backend regression suite | `.venv` Python 3.14: `python -B -m unittest discover -s tests` | PASS | 97 tests passed; 1 real-Mongo integration test class skipped. |
  | Frontend tests and maintenance score | `npm test` | PASS | 16 tests passed, including the existing score thresholds and missing-data rule. |
  | Frontend types, lint, production build | `npm run typecheck`, `npm run lint`, `npm run build` | PASS with warnings | Typecheck/build passed; lint 0 errors and 5 existing React Hook Form compatibility warnings. Build reports existing Vite `__dirname` and large-chunk warnings. |
  | Live Gemini/Tavily | Credential presence check; no paid calls made | NOT RUN | Provider credentials are not configured in the local backend environment. |
  | MongoDB integration | Local service availability check | NOT RUN | No local MongoDB listener/test database available; one integration test class skipped. No remote/production database used. |
  | Authenticated browser and cross-user/cross-vehicle workflows | Not run | NOT RUN | Requires a running isolated backend/database, dedicated test account and synthetic vehicles. |
  | Python 3.13 / Docker | Runtime availability check | BLOCKED | Only Python 3.14 is installed; Docker CLI is unavailable. |
- **Code-level findings/fixes:** overdue schedules no longer occupy all three candidate slots; engine/generation were added to identity matching and cache scope; explicit technical applicability mismatches fail closed; arbitrary title years are not treated as vehicle model years; model-generated findings, recommendations, risk claims, confidence and maintenance intervals are excluded; a matched excerpt is displayed only as text found in an allowed search result and is explicitly not represented as verified technical accuracy. The report remains unreviewed and source coverage is narrow.
- **Limitations:** the current app does not have a user-editable generation field; engine strings may be too generic to verify a code-specific source, in which case that source is rejected. The existing allowed-source list is narrow. Even source-matched content can be false or misleading; there is no independent technical fact-check or mechanic review, and reports remain informational.

**Recommended next step:** after isolated MongoDB, live-provider, authenticated-browser and Python 3.13/Docker verification are available, expand the source set only through separately reviewed primary technical references and test coverage. Keep confirmed manufacturer schedules separate from specialist preventive advice. Any curated knowledge should be keyed by make/model/year/engine/transmission and interval, and reviewed against service manuals and qualified mechanic feedback. Continue to preserve the existing local Maintenance Score; do not add component-failure probabilities without representative, consented outcome data and independent validation.

### Global UI/UX modernisation — Stage 0 repository audit — 2026-11-09

- **Frontend architecture:** Vite + React 19 + TypeScript; React Router owns routing, TanStack Query owns server state, Zustand-backed auth state supplies bearer tokens to the shared Axios client, and React Hook Form/Zod handle forms. Feature code is grouped under `frontend/src/features`; the app shell is in `layouts/DashboardLayout.tsx` and `shared/components/common`.
- **Routes and authentication:** `/login` and `/register` are public-only; `/dashboard`, `/garage`, `/garage/:vehicleId`, `/garage/:vehicleId/service-history`, and `/ai` are protected. `/` redirects to Dashboard. Settings, profile, workshop, analytics, and fleet page components exist in the repository but are not routed; the redesign must not add destinations for them without an actual route/product decision. Existing authentication gates and paths must remain intact.
- **Shell/navigation:** Desktop uses a fixed 256px sidebar; mobile uses the existing Base UI Sheet drawer. The sidebar has Dashboard, Garage, and Maintenance only. Navbar currently presents a hardcoded “Dashboard / Vehicle overview” regardless of route, offers theme selection, and has a non-functional notifications button. Desktop sidebar collapse is not implemented. Logout is wired; there are no existing Settings/Profile navigation destinations.
- **Styling/shared UI:** Tailwind CSS v4, `tw-animate-css`, shadcn styles, CSS custom properties, and Base UI primitives are already present. There are 33 shared UI components, including Button, Card, Badge, Input, Select/Combobox, Dialog, Sheet, dropdown, tooltip, and toast. Noto Sans and Figtree variable fonts are configured. Theme variables currently use a green primary; pages frequently override them with hardcoded dark surfaces and SmartDrive red, so the visual system is inconsistent. Auth pages and shell rely more on generic theme tokens.
- **Page/data map:** Dashboard (`features/dashboard/pages/DashboardPage.tsx`) uses vehicle and all-maintenance queries, derived statistics/distribution, due lists, score summary, and mileage charts; recent-service UI uses actual records. Garage (`features/garage/pages/GaragePage.tsx`) uses vehicle and service queries, real garage statistics, search, saved grid/list choice, CRUD dialogs, and uploaded photos. Vehicle Details (`features/garage/pages/VehicleDetailsPage.tsx`) loads the selected vehicle, maintenance visits, and service history, then renders URL-addressable Overview/History/Maintenance/Insights/Documents tabs. Insights hosts the existing research guidance, predictive report, and read-only assistant.
- **Current Maintenance baseline:** `/ai` currently combines the vehicle selector, local fixed-rule score cards, and the separate research panel. `maintenanceScore.ts` is the score source of truth and already has frontend regression tests. The UI explains score limitations and missing schedules, but currently has no circular score visualization, status-distribution counters, card/list switch, scoring-rules modal, or maintenance detail drawer. These are Stage 2 UI additions only; score logic must remain unchanged.
- **Data/API boundaries:** Vehicle CRUD/photo flows use `vehicleApi` and `useVehicles`; service records use `maintenanceApi` and `useMaintenance`; history uses `serviceHistoryApi` and `useServiceHistory`; receipts and AI features have their own existing APIs/hooks. Page redesigns should reuse these contracts and query states rather than add API/schema changes.
- **Responsive/accessibility baseline:** Tailwind breakpoints, some mobile single-column layouts, keyboard-capable Base UI controls, visible focus styles, and tab keyboard handling exist. Responsive behavior is implemented page by page with some hardcoded colors; there is no shared page-header/section-header/loading-empty/error-state design abstraction. Stage 1 should establish consistent reusable patterns without replacing existing primitives unnecessarily.
- **Audit limitations:** The supplied brief references a Maintenance visual reference, but its pasted-text attachment contains no image. Stage planning is based on the written requirements and current repository; no unprovided visual details are assumed.
- **Implementation plan:** (1) Stage 1: define SmartDrive semantic color/radius/surface tokens, normalize shared Button/Card/Badge/forms/modal states, and refine app shell, route-aware page heading, desktop/mobile navigation while preserving all paths/auth. (2) Stage 2: redesign Maintenance using existing real vehicle/schedule data and unchanged scoring utility; add rules modal, circular score, distribution, card/list presentation and detail drawer. (3) Stage 3: harmonize data-driven Dashboard and Garage, including actual status/schedule/activity states and existing search/grid/list/CRUD. (4) Stage 4: align Vehicle Details and all Insights panels to the system, preserving tabs, URLs, uploads, sources, cache behavior and AI APIs. Each stage gets its own test/typecheck/lint/build pass, documentation update and report before the following stage starts.
- **Stage 0 status:** Repository audit and repository-specific implementation plan complete. No application code or business logic was changed during this audit; visual implementation and its verification are pending Stage 1.

### Phase 4 preventive maintenance planner — 2026-11-09

- **Architecture implemented:** a FastAPI planner service/repository and protected router; MongoDB `maintenance_plans` aggregate; TypeScript API/types/query hooks; dedicated responsive `/maintenance/planner` page with vehicle/plan selection, proposed/upcoming/history views, calendar, action detail, and reminders. Garage Maintenance and the existing Maintenance page link into the planner.
- **Plan generation:** only the newest saved service item per maintenance type contributes a scheduled action, and only when it has a saved next-due date or mileage. Triggers retain their recorded targets; the earlier of date/mileage governs overdue status. Optional owner-provided monthly mileage can project a date from a mileage target. Cached Phase 3 reports are read without provider calls and only source-matched `MONITOR` records with allowed source references are offered as review guidance. All generated actions begin Proposed; no intervals or costs are inferred.
- **Lifecycle and approval:** owners can approve selected/all proposals, continue reviewing proposals after plan activation, add personal proposals to draft/active plans, edit, reschedule, start, skip/restore, cancel, complete, archive, and inspect action provenance/history. A partial unique index limits each owner/vehicle to one active plan. Plan actions are bounded to 200; aggregate mutations increment the plan version.
- **Completion and service history:** completion requires confirmed date, mileage, and work description. The UI explicitly asks whether to create a service-history visit; declining completes the action without a visit. Confirmed visit creation uses the existing maintenance service and stores a unique `maintenance_action_id`, preserving the source schedule targets unless the owner supplies new targets. Vehicle odometer only advances. Duplicate linked visits are guarded by a unique partial Mongo index. No transaction is claimed; the unique link is the idempotency safeguard.
- **Reminders:** date/mileage thresholds, enabled/dismissed status, and capped history are persisted. The planner evaluates reminders on reads and allows dismissal/re-enable. There is no background worker or email/push integration, so these are in-app, on-open reminders only.
- **Files changed:** added planner schemas, repository, service, router, frontend API/types/hooks/components/page and planner utility tests; wired app routing and Maintenance navigation; registered Mongo indexes; extended the existing service-record writer with an internal action-link parameter; updated README, API, database, and architecture documentation. No maintenance-score code or provider architecture was changed.
- **Fixed during verification:** active plans previously rejected personal action creation, and approving only selected actions left remaining proposals impossible to approve. Active plan actions are now addable, and additional proposals can be approved after activation. Plan caps are enforced at Mongo update time. Frontend form submission errors are caught and surfaced in the planner error state.
- **Backend verification:** `.venv\\Scripts\\python.exe -B -m unittest discover -s tests` — **120 passed, 1 skipped**. Planner-focused tests: **23 passed**. The skipped class is a real Mongo integration test; planner persistence/index behavior has not been exercised against an actual MongoDB service in this task.
- **Frontend verification:** `npm test` — **19 passed** (includes planner counts/calendar and existing Maintenance Score regression tests); `npm run typecheck` — passed; `npm run lint` — passed with 0 errors and 5 pre-existing React Hook Form compatibility warnings; `npm run build` — passed. Build emitted existing Vite `__dirname` compatibility and large-chunk warnings.
- **Not verified:** live MongoDB indexes/concurrency and persistence; authenticated browser flows; Docker/Linux deployment; provider-connected Phase 3 recommendations in a real database. No paid provider requests, production data, commit, or push were used.
- **Known limitation:** reminder delivery is not proactive; owners see due reminder thresholds when opening the planner. A worker/notification transport is the next infrastructure requirement if push/email or background delivery is desired. Generation intentionally reuses the latest recorded due target rather than calculating manufacturer intervals.

**Recommended next step:** run the planner against an isolated MongoDB database and a dedicated test account/vehicle, verifying index creation, approval concurrency, completion retry/linking, archive preservation, and reminder persistence before enabling it for real vehicle records.
